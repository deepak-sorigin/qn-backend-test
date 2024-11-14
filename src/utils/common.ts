export class CommonUtils {
  static multiply(value: any, valueToMultiply: number) {
    return +value * valueToMultiply;
  }

  static getName(names: string[]) {
    // remove names that are empty
    names = names.filter((name) => name);
    return names.join('_');
  }
}
