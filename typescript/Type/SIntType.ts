class SIntType extends Type {

    public test(mixed: any, errors: any[] = null): boolean {
        if (Utils.isString(mixed)) {
            return /^(0|(\-)?[1-9]([0-9]+)?)$/.test(mixed);
        } else {
            return false;
        }
    }

}
