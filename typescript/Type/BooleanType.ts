class BooleanType extends Type {
    public test( mixed: any, errors: any[] = null ): boolean {
        return true === mixed || false === mixed;
    }
}
