const PAIR_SEPARATOR = ";";
const VALUE_SEPARATOR = "=";
const EXPIRED = /;\s*max-age=0(?:;|$)/i;
const COOKIE_JOINER = "; ";

export class CookieJar {
    private readonly cookies = new Map<string, string>();

    keep(response: Response): void {
        response.headers.getSetCookie().forEach((header) => this.store(header));
    }

    header(): string {
        return [...this.cookies].map(([name, value]) => `${name}=${value}`).join(COOKIE_JOINER);
    }

    private store(header: string): void {
        const [pair = ""] = header.split(PAIR_SEPARATOR);
        const at = pair.indexOf(VALUE_SEPARATOR);
        const name = pair.slice(0, at).trim();
        if (EXPIRED.test(header)) this.cookies.delete(name);
        else this.cookies.set(name, pair.slice(at + 1));
    }
}
