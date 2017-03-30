class Utils {

    public static isArray(variable: any): boolean {
        return variable && ( variable instanceof Array );
    }

    public static isComplex(variable: any): boolean {
        return variable && (typeof variable === 'object');
    }

    public static hasProperty(variable: any, propertyName: any): boolean {
        return Utils.isComplex(variable) && variable.hasOwnProperty(propertyName);
    }

    public static getProperty(variable: any, propertyName: any): any {
        if (Utils.hasProperty(variable, propertyName)) {
            return variable[propertyName];
        } else {
            return null;
        }
    }

    public static getKeys(variable: any): string[] {
        if (!Utils.isComplex(variable)) {
            return [];
        } else {

            let result: string[] = [];

            if (Utils.isArray(variable)) {
                for (let i = 0, len = variable.length; i < len; i++) {
                    result.push(String(i));
                }
            } else {
                for (let key in variable) {
                    if (variable.hasOwnProperty(key)) {
                        result.push(key);
                    }
                }
            }

            return result;
        }
    }

    public static isString(variable: any): boolean {
        return typeof variable === 'string';
    }

    public static isSet(variable: any): boolean {
        return undefined !== variable;
    }

    public static isInt(variable: any) {
        return typeof variable === 'number' && isFinite(variable) && !isNaN(variable) && Math.round(variable) === variable;
    }

    public static arrayKeyExists(key: string, variable: any): boolean {
        return Utils.isComplex(variable) && variable.hasOwnProperty(key);
    }

    public static arrayMerge(a: any[], b: any[]): any[] {
        let result: any[] = [];

        for (let i = 0, len = a.length; i < len; i++) {
            result.push(a[i]);
        }

        for (let i = 0, len = b.length; i < len; i++) {
            result.push(b[i]);
        }

        return result;
    }

    public static arrayValues(variable: any): any[] {
        return Utils.isArray(variable)
            ? variable.slice(0)
            : [];
    }

    public static arrayUnique(variable: any): any[] {
        if (!Utils.isArray(variable)) {
            return [];
        }

        let result: any[] = [],
            seen: boolean,
            j: number,
            i: number,
            len: number;

        for (i = 0, len = variable.length; i < len; i++) {

            seen = false;

            for (j = 0; j < i; j++) {
                if (variable[i] === variable[j]) {
                    seen = true;
                    break;
                }
            }

            if (!seen) {
                result.push(variable[i]);
            }
        }

        return result;

    }

    static isFloat(mixed: any): boolean {
        return typeof mixed === 'number' && isFinite(mixed) && !isNaN(mixed) && Math.round(mixed) !== mixed;
    }

    static reverseString(str: string): string {
        let result: string = '';
        for (let i = str.length - 1; i > -1; i--) {
            result = result + str.charAt(i);
        }
        return result;
    }
}
