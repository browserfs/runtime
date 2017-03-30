class AnyType extends Type {

    public test(mixed: any, errors: any[] = null ): boolean {
        return undefined !== mixed;
    }

}