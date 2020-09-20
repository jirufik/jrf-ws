module.exports = (fn) => {
  const isAsync = /^async/.test(fn.toString());
  return isAsync;
}