function parseISODurationToMs(str) {
  if (!str) return 0;
  const m = str.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if (!m) return 0;
  const days = parseInt(m[1]||0,10);
  const hours = parseInt(m[2]||0,10);
  const mins = parseInt(m[3]||0,10);
  return (((days*24+hours)*60)+mins)*60*1000;
}
module.exports = { parseISODurationToMs };