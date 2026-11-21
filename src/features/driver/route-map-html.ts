import type { GeoPoint } from '@/domain/routing'
import { stopColor, stopForeground } from '@/lib/stops'
import { colors } from '@/theme/tokens'

import { MAPLIBRE_CSS, MAPLIBRE_JS } from './maplibre-dist.generated'
import { goongStyleUrl } from './map-style'

export type RouteMapPoint = GeoPoint & { readonly id: string; readonly number: number; readonly name: string }

export type RouteMapVehicle = GeoPoint & { readonly heading?: number }

export type RouteMapView = {
  readonly depot?: GeoPoint
  readonly stops: readonly RouteMapPoint[]
  readonly path?: readonly GeoPoint[]
  readonly vehicle?: RouteMapVehicle
}

/** Đường tuyến: polyline backend, hoặc nối thẳng kho → các điểm theo thứ tự. */
export function routeLine({ depot, stops, path }: RouteMapView): readonly GeoPoint[] {
  if (path && path.length > 1) return path
  return depot ? [depot, ...stops] : stops
}

export type RouteMapOptions = {
  /** Camera bám xe + heading-up. Mặc định false: nhìn cả tuyến. */
  readonly follow?: boolean
  /** Góc nghiêng camera khi đang bám xe (bản phóng lớn). */
  readonly pitch?: number
  /** Nút +/− MapLibre. Chỉ bản phóng lớn: bản thu nhỏ đã có nút Maximize2 cùng góc. */
  readonly navigation?: boolean
}

export type RouteMapPayload = {
  readonly styleUrl: string | undefined
  readonly background: string
  readonly primary: string
  readonly line: readonly [number, number][]
  readonly depot?: [number, number]
  readonly stops: readonly { readonly number: number; readonly lngLat: [number, number]; readonly color: string; readonly fg: string }[]
  readonly vehicle?: [number, number]
  readonly heading?: number
  readonly follow?: boolean
  readonly pitch?: number
  readonly navigation?: boolean
}

const lngLat = (point: GeoPoint): [number, number] => [point.lng, point.lat]

/** Dữ liệu MapLibre trong WebView: cùng nền Goong với web, hoặc nền trống khi chưa có khoá. */
export function routeMapPayload(view: RouteMapView, key?: string, options?: RouteMapOptions): RouteMapPayload {
  return {
    styleUrl: goongStyleUrl(key),
    background: colors.lineSoft,
    primary: colors.primary,
    line: routeLine(view).map(lngLat),
    depot: view.depot ? lngLat(view.depot) : undefined,
    stops: view.stops.map((stop) => ({
      number: stop.number,
      lngLat: lngLat(stop),
      color: stopColor(stop.number),
      fg: stopForeground(stop.number),
    })),
    vehicle: view.vehicle ? lngLat(view.vehicle) : undefined,
    heading: view.vehicle?.heading,
    ...(options?.follow ? { follow: true } : {}),
    ...(options?.pitch ? { pitch: options.pitch } : {}),
    ...(options?.navigation ? { navigation: true } : {}),
  }
}

/**
 * HTML MapLibre: nền Goong, lớp tuyến GeoJSON, mốc kho / điểm / xe. Không tải Google Maps. MapLibre (JS + CSS) nằm **ngay trong trang**,
 * đóng gói cùng app (`scripts/vendor-maplibre.mjs`): không gọi CDN, nên mạng yếu chỉ mất nền Goong, tuyến và mốc vẫn vẽ.
 */
export function routeMapHtml(payload: RouteMapPayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${MAPLIBRE_CSS}</style>
<style>
  html,body,#map{margin:0;height:100%;background:${payload.background}}
  .pin{width:28px;height:28px;border:2px solid #fff;box-shadow:0 1px 2px rgba(14,28,33,.2);display:grid;place-items:center;font:700 11px/1 system-ui,sans-serif}
  .stop{border-radius:50%}
  .depot{border-radius:6px;background:${payload.primary};color:#fff}
  .vehicle{width:32px;height:32px;border-radius:50%;background:#fff;border:2px solid ${payload.primary}}
  .vehicle i{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid ${payload.primary};transform-origin:50% 70%}
  .maplibregl-ctrl-attrib{font-size:10px}
</style>
</head><body>
<div id="map"></div>
<script>${MAPLIBRE_JS}</script>
<script>
(function(){
  var data=${json};
  var empty={version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':data.background}}]};
  var map=new maplibregl.Map({
    container:'map',
    style:data.styleUrl||empty,
    center:[106.8,10.9],
    zoom:9,
    dragRotate:false,
    pitchWithRotate:false,
    attributionControl:{compact:true}
  });
  map.touchZoomRotate.disableRotation();
  if(data.navigation) map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
  var vehicleMarker=null;
  var following=!!data.follow;
  var lastHeading=data.heading;
  function post(msg){
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else if(window.parent && window.parent!==window) window.parent.postMessage(msg,'*');
  }
  function fit(){
    var pts=data.line.concat(data.depot?[data.depot]:[]).concat(data.stops.map(function(s){return s.lngLat}));
    if(!pts.length) return;
    if(pts.length===1){ map.jumpTo({center:pts[0],zoom:14,pitch:0,bearing:0}); return; }
    var b=pts.reduce(function(acc,p){return acc.extend(p)}, new maplibregl.LngLatBounds(pts[0],pts[0]));
    map.fitBounds(b,{padding:44,maxZoom:14,animate:false,pitch:0,bearing:0});
  }
  function releaseFollow(){
    if(!following) return;
    following=false;
    try{ map.stop(); }catch(e){}
    post('unfollowed');
  }
  function onUserCamera(e){
    if(!e || !e.originalEvent) return;
    releaseFollow();
  }
  function easeToVehicle(lngLat,heading,snap){
    if(!following || !lngLat) return;
    var cam={center:lngLat,pitch:data.pitch||0,duration:snap?0:400,padding:{top:56,bottom:88,left:24,right:24}};
    if(heading!=null && isFinite(heading)) cam.bearing=heading;
    if(snap) cam.zoom=16;
    map.easeTo(cam);
  }
  function draw(){
    var geo={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:data.line}};
    var src=map.getSource('route');
    if(src) src.setData(geo);
    else if(data.line.length>1){
      map.addSource('route',{type:'geojson',data:geo});
      map.addLayer({id:'route-casing',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':6.5,'line-opacity':0.9}});
      map.addLayer({id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':data.primary,'line-width':4}});
    }
  }
  function marker(el,lngLat){ return new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(lngLat).addTo(map); }
  function stopEl(s){
    var el=document.createElement('div');
    el.className='pin stop';
    el.style.background=s.color;
    el.style.color=s.fg;
    el.textContent=String(s.number);
    return el;
  }
  function placeVehicle(lngLat,heading){
    if(!lngLat){ if(vehicleMarker){ vehicleMarker.remove(); vehicleMarker=null; } return; }
    if(vehicleMarker){ vehicleMarker.setLngLat(lngLat); }
    else {
      var el=document.createElement('div');
      el.className='pin vehicle';
      el.innerHTML='<i></i>';
      vehicleMarker=marker(el,lngLat);
    }
    var needle=vehicleMarker.getElement().querySelector('i');
    if(needle && heading!=null && isFinite(heading)) needle.style.transform='rotate('+heading+'deg)';
    lastHeading=heading;
    easeToVehicle(lngLat,heading,false);
  }
  var styleLoaded = false;
  var markersAdded = false;
  function renderMapContent(){
    draw();
    if(!markersAdded){
      if(data.depot){
        var d=document.createElement('div');
        d.className='pin depot';
        d.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/></svg>';
        marker(d,data.depot);
      }
      data.stops.forEach(function(s){ marker(stopEl(s), s.lngLat); });
      placeVehicle(data.vehicle, data.heading);
      markersAdded = true;
    }
    map.resize();
    if(following && (data.vehicle || vehicleMarker)){
      if(data.vehicle) easeToVehicle(data.vehicle, data.heading, true);
    } else {
      fit();
    }
    post('ready');
  }
  map.on('style.load', function(){
    styleLoaded = true;
    renderMapContent();
  });
  map.on('load', function(){
    renderMapContent();
  });
  map.on('error', function(){
    if(!styleLoaded && data.styleUrl){
      data.styleUrl = undefined;
      map.setStyle(empty);
    }
  });
  function afterResize(){ map.resize(); }
  window.addEventListener('resize', afterResize);
  setTimeout(afterResize, 200);
  setTimeout(afterResize, 600);
  // Chỉ cử chỉ tay / nút −+ (có originalEvent). easeTo của Về giữa không có — không tự unfollow rồi fit cả tuyến.
  map.on('dragstart', onUserCamera);
  map.on('zoomstart', onUserCamera);
  map.on('rotatestart', onUserCamera);
  map.on('pitchstart', onUserCamera);
  window.__lmVehicle=function(lng,lat,heading){ placeVehicle(lng==null?null:[lng,lat], heading); };
  window.__lmFollow=function(){
    following=true;
    if(vehicleMarker) easeToVehicle(vehicleMarker.getLngLat(), lastHeading, true);
  };
})();
</script>
</body></html>`
}
