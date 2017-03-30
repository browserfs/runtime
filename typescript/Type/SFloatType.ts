class SFloatType extends Type {

    public test( mixed: any, errors: any[] = null ): boolean {
        if ( typeof mixed === 'string' ) {
            return /^(0|(\-)?[1-9]([0-9]+)?)\.[0-9]+$/.test(mixed);
        } else {
            return false;
        }
    }

}