import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for merchant-authored `custom_html` CMS blocks.
 *
 * The storefront renders this HTML into its own page, where the buyer's session
 * token lives, so a staff account with CMS write access must not be able to run
 * script there. Applied on the public read, which also covers blocks stored
 * before this existed. Anything not listed (script, iframe, style, form,
 * inline event handlers, `javascript:` URLs) is dropped.
 */
const CMS_HTML_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: {
        "*": ["class", "id", "dir", "lang", "title"],
        a: ["href", "name", "target", "rel"],
        img: ["src", "srcset", "alt", "width", "height", "loading"],
        td: ["colspan", "rowspan"],
        th: ["colspan", "rowspan", "scope"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
        // A link that opens a new window must not hand it a reference to the shop
        a: (tagName, attribs) => ({
            tagName,
            attribs: attribs.target ? {...attribs, rel: "noopener noreferrer"} : attribs,
        }),
    },
};

export function sanitizeCmsHtml(html: string): string {
    return sanitizeHtml(html, CMS_HTML_OPTIONS);
}
