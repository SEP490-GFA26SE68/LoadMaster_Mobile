// Test đọc giờ theo giờ Việt Nam như bản web; thiếu dòng này thì máy CI chạy UTC thấy giờ khác máy dev.
module.exports = () => {
  process.env.TZ = 'Asia/Ho_Chi_Minh'
}
