class StringParser {

    protected parsed: string = '';
    protected remain: string = '';
    protected lineNum: number = 1;
    protected fileName: string = '<UNKNOWN>';

    constructor(buffer: string) {
        this.remain = buffer;
    }

    public consume( numberOfBytes: number ): void {
        if ( numberOfBytes < 0 ) {
            throw new Error('Invalid argument');
        }

        let chunk = this.remain.substr(0, numberOfBytes);
        let bytes = chunk.length;

        if ( bytes === 0 ) {
            return;
        }

        for ( let i=0; i<bytes; i++ ) {

            if ( chunk.charAt(i) === "\r" ) {

                if ( ( i + 1 < bytes ) && ( chunk.charAt(i+1) == "\n" ) ) {
                    i++;
                }

                this.lineNum++;

            } else
            if ( chunk.charAt(i) == "\n" ) {
                this.lineNum++;
            }
        }

        this.parsed += chunk;
        this.remain = this.remain.substr(bytes);
    }

    public tell(): number {
        return this.parsed.length;
    }

    public available(): number {
        return this.remain.length;
    }

    public eof(): boolean {
        return this.remain === '';
    }

    public line(): number {
        return this.lineNum;
    }

    public file(): string {
        return this.fileName;
    }

    public setFileName( name: string = null ) {
        this.fileName = name || '<UNKNOWN>';
    }

    public canReadString(str: string): boolean {
        if ( typeof str === "string" ) {
            return this.remain.substr(0, str.length) === str;
        } else {
            return false;
        }
    }

    public canReadExpression(str: RegExp): string[] {
        return str
            ? str.exec(this.remain)
            : null;
    }

    public toString(): string {
        return this.remain;
    }

    public nextToken(): string {
        if ( this.eof() ) {
            return 'END_OF_FILE';
        } else {
            let matches;
            if ( matches = /^([\s]+)?([^\s]+)/.exec( this.remain ) ) {
                return matches[0];
            } else {
                return '';
            }
        }
    }
}
