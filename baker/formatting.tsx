import * as cheerio from "cheerio"
import {
    DataValueConfiguration,
    DataValueQueryArgs,
    FormattedPost,
    FormattingOptions,
    KeyValueProps,
    OwidVariableId,
} from "../clientUtils/owidTypes.js"
import { Country } from "../clientUtils/countries.js"
import { countryProfileDefaultCountryPlaceholder } from "../site/countryProfileProjects.js"
import { BAKED_BASE_URL } from "../settings/serverSettings.js"
import { DATA_VALUE } from "../site/DataValue.js"
import {
    OwidVariableDataMetadataDimensions,
    OwidVariablesAndEntityKey,
} from "../clientUtils/OwidVariable.js"
import {
    OwidChartDimensionInterface,
    OwidVariableDisplayConfigInterface,
} from "../clientUtils/OwidVariableDisplayConfigInterface.js"
import { legacyToOwidTableAndDimensions } from "../grapher/core/LegacyToOwidTable.js"
import { getBodyHtml } from "../site/formatting.js"
import { Url } from "../clientUtils/urls/Url.js"
import * as path from "path"
import { capitalize } from "../clientUtils/Util.js"

export const DEEP_LINK_CLASS = "deep-link"

export const extractFormattingOptions = (html: string): FormattingOptions => {
    const formattingOptionsMatch = html.match(
        /<!--\s*formatting-options\s+(.*)\s*-->/
    )
    return formattingOptionsMatch
        ? parseFormattingOptions(formattingOptionsMatch[1])
        : {}
}

// Converts "toc:false raw somekey:somevalue" to { toc: false, raw: true, somekey: "somevalue" }
// If only the key is specified, the value is assumed to be true (e.g. "raw" above)
export const parseFormattingOptions = (text: string): FormattingOptions => {
    return parseKeyValueArgs(text)
}

export const dataValueRegex = new RegExp(
    `{{\\s*${DATA_VALUE}\\s*(.+?)\\s*}}`,
    "g"
)

export const extractDataValuesConfiguration = async (
    html: string
): Promise<Map<string, DataValueConfiguration>> => {
    const dataValueSeparator = /\s*\|\s*/
    const dataValuesConfigurations = new Map<string, DataValueConfiguration>()

    const dataValueMatches = html.matchAll(dataValueRegex)
    for (const match of dataValueMatches) {
        const dataValueConfigurationString = match[1]
        const [queryArgsString, template] =
            dataValueConfigurationString.split(dataValueSeparator)
        const queryArgs = parseDataValueArgs(queryArgsString)

        dataValuesConfigurations.set(dataValueConfigurationString, {
            queryArgs,
            template,
        })
    }
    return dataValuesConfigurations
}

export const parseDataValueArgs = (
    rawArgsString: string
): DataValueQueryArgs => {
    return Object.fromEntries(
        Object.entries(parseKeyValueArgs(rawArgsString)).map(([k, v]) => [
            k,
            Number(v),
        ])
    )
}

export const parseKeyValueArgs = (text: string): KeyValueProps => {
    const options: { [key: string]: string | boolean } = {}
    text.split(/\s+/)
        // filter out empty strings
        .filter((s) => s && s.length > 0)
        .forEach((option: string) => {
            // using regex instead of split(":") to handle ":" in value
            // e.g. {{LastUpdated timestampUrl:https://...}}
            const optionRegex = /([^:]+):?(.*)/
            const [, name, value] = option.match(optionRegex) as [
                any,
                string,
                string
            ]
            let parsedValue
            if (value === "" || value === "true") parsedValue = true
            else if (value === "false") parsedValue = false
            else parsedValue = value
            options[name] = parsedValue
        })
    return options
}

export const formatDataValue = (
    value: number,
    variableId: OwidVariableId,
    legacyVariableDisplayConfig: OwidVariableDisplayConfigInterface = {},
    legacyChartDimension: OwidChartDimensionInterface | undefined
) => {
    if (!legacyChartDimension) return
    const legacyVariable: OwidVariableDataMetadataDimensions = {
        data: {
            values: [value],
            years: [],
            entities: [],
        },
        metadata: {
            id: variableId,
            display: legacyVariableDisplayConfig,
            dimensions: {
                years: { values: [] },
                entities: { values: [] },
            },
        },
    }
    const legacyVariableDataMap = new Map([[variableId, legacyVariable]])

    const legacyGrapherConfig = {
        dimensions: [
            {
                ...legacyChartDimension,
            },
        ],
    }

    const { table, dimensions } = legacyToOwidTableAndDimensions(
        legacyVariableDataMap,
        legacyGrapherConfig
    )

    const formattedValueWithUnit = table
        .get(dimensions[0].slug)
        .formatValueLong(table.rows[0][variableId])

    return formattedValueWithUnit
}

export const formatCountryProfile = (
    post: FormattedPost,
    country: Country
): FormattedPost => {
    // Localize country selector
    const htmlWithLocalizedCountrySelector = post.html.replace(
        countryProfileDefaultCountryPlaceholder,
        country.code
    )

    const cheerioEl = cheerio.load(htmlWithLocalizedCountrySelector)

    // Inject country names on h3 headings which have been already identified as subsections
    // (filtering them out based on whether they have a deep link anchor attached to them)
    cheerioEl(`h3 a.${DEEP_LINK_CLASS}`).each((_, deepLinkAnchor) => {
        const $deepLinkAnchor = cheerioEl(deepLinkAnchor)
        $deepLinkAnchor.after(`${country.name}: `)
    })

    return { ...post, html: getBodyHtml(cheerioEl) }
}

// Assumes formatUrls URL standardisation
export const isCanonicalInternalUrl = (url: Url): boolean => {
    if (!url.originAndPath) return false
    // no origin === links without e.g. https://ourworldindata.org
    return !url.origin || url.origin.startsWith(BAKED_BASE_URL)
}

/**
 * Format images
 *
 * Assumptions:
 * - original images are not uploaded with a suffix "-[number]x[number]"
 *   (without the quotes).
 * - variants are being generated by wordpress when the original is uploaded
 * - images are never legitimate direct descendants of <a> tags. <a><img /></a>
 *   is considered deprecated (was used to create direct links to the full
 *   resolution variant) and wrapping <a> will be removed to prevent conflicts
 *   with lightboxes. Chosen over preventDefault() in front-end code to avoid
 *   clicks before javascript executes.
 */
export const formatImages = ($: CheerioStatic) => {
    for (const el of $("img").toArray()) {
        const $el = $(el)
        if ($el.closest("[data-no-img-formatting]").length) continue

        // Recreate source image path by removing automatically added image
        // dimensions (e.g. remove 800x600).
        const src = el.attribs["src"]
        const parsedPath = path.parse(src)
        let originalFilename = ""

        if (parsedPath.ext !== ".svg") {
            originalFilename = parsedPath.name.replace(/-\d+x\d+$/, "")
            const originalSrc = path.format({
                dir: parsedPath.dir,
                name: originalFilename,
                ext: parsedPath.ext,
            })
            el.attribs["data-high-res-src"] = originalSrc
        } else {
            originalFilename = parsedPath.name
        }

        // Remove wrapping <a> tag, conflicting with lightbox (cf. assumptions above)
        if (el.parent.tagName === "a") {
            const $a = $(el.parent)
            $a.replaceWith($el)
        }

        if (!el.attribs["alt"]) {
            el.attribs["alt"] = capitalize(
                originalFilename.replace(/[-_]/g, " ")
            )
        }

        if (!el.attribs["loading"]) {
            el.attribs["loading"] = "lazy"
        }
    }
}
