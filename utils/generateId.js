module.exports = ({len = 15, smallChar = true, bigChar = true, num = false, withDate = true} = {}) => {

  let strId = '';
  let patern = '';

  if (smallChar) {
    patern += 'abcdefghijklmnopqrstuvwxyz';
  }
  if (bigChar) {
    patern += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  if (num) {
    patern += '0123456789';
  }

  for (let i = 0; i < len; i++) {
    strId += patern.charAt(Math.floor(Math.random() * patern.length));
  }

  if (withDate) {
    const now = new Date();
    strId = `${strId}${now.getDate()}${now.getMonth()}${now.getFullYear()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;
  }

  return strId;
}
