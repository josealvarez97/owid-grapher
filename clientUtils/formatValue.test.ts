#! /usr/bin/env jest
import { formatValue, TickFormattingOptions } from "./formatValue"

describe(formatValue, () => {
    // prettier-ignore
    const cases: [string, number, string, TickFormattingOptions][] = [
        ["default", 1, "1", {}],
        ["default negative", -1, "-1", {}],
        ["default large specific", 1234567890, "1.23 billion", {}],
        ["default large specific with rounding", 1239999999, "1.24 billion", {}],
        ["default small", 0.0000000001, "<0.01", {}],
        ["thousand", 1000, "1,000", {}],
        ["ten thousand", 10000, "10,000", {}],
        ["hundred thousand", 100000, "100,000", {}],
        ["hundred thousand specific", 123456, "123,000", {}],
        ["hundred thousand specific decimals", 123456.789, "123,456.79", {}],
        ["million", 1000000, "1 million", {}],
        ["billion", 1000000000, "1 billion", {}],
        ["trillion", 1000000000000, "1 trillion", {}],
        ["quadrillion", 1000000000000000, "1 quadrillion", {}],
        ["negative million", -1000000, "-1 million", {}],
        ["negative billion", -1000000000, "-1 billion", {}],
        ["negative trillion", -1000000000000, "-1 trillion", {}],
        ["negative quadrillion", -1000000000000000, "-1 quadrillion", {}],
        ["thousand short prefix", 1000, "1,000", { numberAbreviation: "short" }],
        ["ten thousand short prefix", 10000, "10,000", { numberAbreviation: "short" }],
        ["hundred thousand short prefix", 100000, "100,000", { numberAbreviation: "short" }],
        ["million short prefix", 1000000, "1M", { numberAbreviation: "short" }],
        ["billion short prefix", 1000000000, "1B", { numberAbreviation: "short" }],
        ["trillion short prefix", 1000000000000, "1T", { numberAbreviation: "short" }],
        ["quadrillion short prefix", 1000000000000000, "1Quad", { numberAbreviation: "short" }],
        ["2 decimals with integer", 1, "1", { numDecimalPlaces: 2 }],
        ["2 decimals with float", 1.123, "1.12", { numDecimalPlaces: 2 }],
        ["4 decimals with float", 1.123, "1.123", { numDecimalPlaces: 4 }],
        ["with unit", 1, "$1", { unit: "$" }],
        ["negative with unit", -1, "-$1", { unit: "$" }],
        ["trailingZeroes true", 1.10, "1.1", { trailingZeroes: false }], 
        ["trailingZeroes false", 1.10, "1.10", { trailingZeroes: true }], 
        ["$ spaceBeforeUnit false", 1.1, "$1.1", { spaceBeforeUnit: false, unit: "$" }],
        ["$ spaceBeforeUnit true", 1.1, "$1.1", { spaceBeforeUnit: true, unit: "$" }],
        ["% spaceBeforeUnit true", 1.1, "1.1 %", { spaceBeforeUnit: true, unit: "%" }],
        ["% spaceBeforeUnit false", 1.1, "1.1%", { spaceBeforeUnit: false, unit: "%" }],
        ["%compound spaceBeforeUnit false", 1.1, "1.1%compound", { spaceBeforeUnit: false, unit: "%compound" }],
        ["numberAbreviation long", 1000000000, "1 billion", { numberAbreviation: "long" }],
        ["numberAbreviation long with unit", 1000000000, "$1 billion", { numberAbreviation: "long", unit: "$" }],
        ["numberAbreviation short", 1000000000, "1B", { numberAbreviation: "short" }],
        ["numberAbreviation false", 1000000000, "1,000,000,000", {numberAbreviation: false}],
        ["showPlus true", 1, "+1", { showPlus: true }],
        ["showPlus false", 1, "1", { showPlus: false }],
        ["showPlus false with negative number", -1, "-1", { showPlus: false }],
        ["showPlus true with unit", 1, "+$1", { showPlus: true, unit: "$" }],
        ["showPlus true with % and 4 decimals", 1.23456, "+1.2346%", {showPlus: true, numDecimalPlaces: 4, unit: "%"}],
        ["showPlus false with $ and trailingZeroes false", 1234.5678, "$1,234.57", {showPlus: false, unit: "$", trailingZeroes: false}],
        ["showPlus false with $, trailingZeroes true, and spaceBeforeUnit true", 1234.5678, "$1,234.57", {showPlus: false, unit: "$", trailingZeroes: true, spaceBeforeUnit: true}],
    ]
    cases.forEach(([description, input, output, options]) => {
        it(description, () => {
            expect(formatValue(input, options)).toBe(output)
        })
    })
})
