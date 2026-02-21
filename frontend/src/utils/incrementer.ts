export default function incrementer(string: string | number): string {
  // args to string
  const str = string.toString();

  // extract string's number
  const match = str.match(/\d+/);
  let numberStr = match === null ? '0' : match[0];

  // store number's length
  const numberLength = numberStr.length;

  // increment number by 1
  let number = (parseInt(numberStr, 10) + 1).toString();

  // if there were leading 0s, add them again
  while (number.length < numberLength) {
    number = '0' + number;
  }

  return str.replace(/[0-9]/g, '').concat(number);
}
