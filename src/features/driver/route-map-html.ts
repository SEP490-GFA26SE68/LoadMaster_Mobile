import type { GeoPoint } from '@/domain/routing'
import { stopColor, stopForeground } from '@/lib/stops'
import { colors } from '@/theme/tokens'

import { goongStyleUrl } from './map-style'

export type RouteMapPoint = GeoPoint & { readonly id: string; readonly number: number; readonly name: string }

export type RouteMapView = {
  readonly depot?: GeoPoint
  readonly stops: readonly RouteMapPoint[]
  readonly path?: readonly GeoPoint[]
  readonly vehicle?: GeoPoint
}

/** Đường tuyến: polyline backend, hoặc nối thẳng kho → các điểm theo thứ tự. */
export function routeLine({ depot, stops, path }: RouteMapView): readonly GeoPoint[] {
  if (path && path.length > 1) return path
  return depot ? [depot, ...stops] : stops
}

export type RouteMapPayload = {
  readonly styleUrl: string | undefined
  readonly background: string
  readonly primary: string
  readonly line: readonly [number, number][]
  readonly depot?: [number, number]
  readonly stops: readonly { readonly number: number; readonly lngLat: [number, number]; readonly color: string; readonly fg: string }[]
  readonly vehicle?: [number, number]
}

const lngLat = (point: GeoPoint): [number, number] => [point.lng, point.lat]

/** Dữ liệu MapLibre trong WebView: cùng nền Goong với web, hoặc nền trống khi chưa có khoá. */
export function routeMapPayload(view: RouteMapView, key?: string): RouteMapPayload {
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
  }
}

const MAPLIBRE_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js'
const MAPLIBRE_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'

/** HTML MapLibre: nền Goong, lớp tuyến GeoJSON, mốc kho / điểm / xe. Không tải Google Maps. */
export function routeMapHtml(payload: RouteMapPayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="${MAPLIBRE_CSS}"/>
<style>
  html,body,#map{margin:0;height:100%;background:${payload.background}}
  .pin{width:28px;height:28px;border:2px solid #fff;box-shadow:0 1px 2px rgba(14,28,33,.2);display:grid;place-items:center;font:700 11px/1 system-ui,sans-serif}
  .stop{border-radius:50%}
  .depot{border-radius:6px;background:${payload.primary}}
  .vehicle{width:32px;height:32px;border-radius:50%;background:#fff;border:2px solid ${payload.primary}}
  .vehicle i{width:8px;height:8px;border-radius:50%;background:${payload.primary}}
  .maplibregl-ctrl-attrib{font-size:10px}
</style>
</head><body>
<div id="map"></div>
<script src="${MAPLIBRE_JS}"></script>
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
  var vehicleMarker=null;
  function fit(){
    var pts=data.line.concat(data.depot?[data.depot]:[]).concat(data.stops.map(function(s){return s.lngLat}));
    if(!pts.length) return;
    if(pts.length===1){ map.jumpTo({center:pts[0],zoom:14}); return; }
    var b=pts.reduce(function(acc,p){return acc.extend(p)}, new maplibregl.LngLatBounds(pts[0],pts[0]));
    map.fitBounds(b,{padding:40,maxZoom:14,animate:false});
  }
  function draw(){
    var geo={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:data.line}};
    var src=map.getSource('route');
    if(src) src.setData(geo);
    else if(data.line.length>1){
      map.addSource('route',{type:'geojson',data:geo});
      map.addLayer({id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':data.primary,'line-width':3}});
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
  function placeVehicle(lngLat){
    if(!lngLat){ if(vehicleMarker){ vehicleMarker.remove(); vehicleMarker=null; } return; }
    if(vehicleMarker){ vehicleMarker.setLngLat(lngLat); return; }
    var el=document.createElement('div');
    el.className='pin vehicle';
    el.innerHTML='<i></i>';
    vehicleMarker=marker(el,lngLat);
  }
  map.on('load', function(){
    draw();
    if(data.depot){
      var d=document.createElement('div');
      d.className='pin depot';
      marker(d,data.depot);
    }
    data.stops.forEach(function(s){ marker(stopEl(s), s.lngLat); });
    placeVehicle(data.vehicle);
    fit();
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
  });
  map.on('error', function(){
    if(data.styleUrl){ data.styleUrl=undefined; map.setStyle(empty); }
  });
  window.__lmVehicle=function(lng,lat){ placeVehicle(lng==null?null:[lng,lat]); };
})();
</script>
</body></html>`
}
