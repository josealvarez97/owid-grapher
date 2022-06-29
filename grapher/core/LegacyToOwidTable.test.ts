#! /usr/bin/env jest

import { ChartTypeName } from "../core/GrapherConstants.js"
import { LegacyGrapherInterface } from "../core/GrapherInterface.js"
import { ColumnTypeMap } from "../../coreTable/CoreTableColumns.js"
import { ErrorValueTypes } from "../../coreTable/ErrorValues.js"
import { legacyToOwidTableAndDimensions } from "./LegacyToOwidTable.js"
import {
    MultipleOwidVariableDataDimensionsMap,
    OwidVariableDataMetadataDimensions,
} from "../../clientUtils/OwidVariable.js"
import {
    OwidColumnDef,
    OwidTableSlugs,
    StandardOwidColumnDefs,
} from "../../coreTable/OwidTableConstants.js"
import { DimensionProperty } from "../../clientUtils/owidTypes.js"

describe(legacyToOwidTableAndDimensions, () => {
    const legacyVariableEntry: OwidVariableDataMetadataDimensions = {
        data: { entities: [1], values: [8], years: [2020] },
        metadata: {
            id: 2,
            display: { conversionFactor: 100 },

            dimensions: {
                years: { values: [{ id: 2020 }] },
                entities: {
                    values: [{ name: "World", code: "OWID_WRL", id: 1 }],
                },
            },
        },
    }
    const legacyVariableConfig: MultipleOwidVariableDataDimensionsMap = new Map(
        [[2, legacyVariableEntry]]
    )
    const legacyGrapherConfig: Partial<LegacyGrapherInterface> = {
        dimensions: [
            {
                variableId: 2,
                property: DimensionProperty.y,
            },
        ],
    }

    it("contains the standard entity columns", () => {
        const { table } = legacyToOwidTableAndDimensions(
            legacyVariableConfig,
            legacyGrapherConfig
        )
        expect(table.columnSlugs).toEqual(
            expect.arrayContaining(
                StandardOwidColumnDefs.map((def) => def.slug)
            )
        )
        expect(table.entityNameColumn.valuesIncludingErrorValues).toEqual([
            "World",
        ])
        expect(table.entityCodeColumn.valuesIncludingErrorValues).toEqual([
            "OWID_WRL",
        ])
    })

    describe("conversionFactor", () => {
        it("applies the more specific chart-level conversionFactor", () => {
            const { table } = legacyToOwidTableAndDimensions(
                legacyVariableConfig,
                {
                    dimensions: [
                        {
                            variableId: 2,
                            display: { conversionFactor: 10 },
                            property: DimensionProperty.y,
                        },
                    ],
                }
            )

            // Apply the chart-level conversionFactor (10)
            expect(table.rows[0]["2"]).toEqual(80)
        })

        it("applies the more variable-level conversionFactor if a chart-level one is not present", () => {
            const { table } = legacyToOwidTableAndDimensions(
                legacyVariableConfig,
                legacyGrapherConfig
            )

            // Apply the variable-level conversionFactor (100)
            expect(table.rows[0]["2"]).toEqual(800)
        })
    })

    describe("variables with years", () => {
        const legacyVariableConfig: MultipleOwidVariableDataDimensionsMap =
            new Map([
                [
                    2,
                    {
                        data: {
                            entities: [1, 1, 1, 2],
                            values: [8, 9, 10, 11],
                            years: [2020, 2021, 2022, 2022],
                        },
                        metadata: {
                            id: 2,
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                        {
                                            name: "High-income",
                                            id: 2,
                                        },
                                    ],
                                },
                                years: {
                                    values: [
                                        { id: 2020 },
                                        { id: 2021 },
                                        { id: 2022 },
                                    ],
                                },
                            },
                        },
                    },
                ],
                [
                    3,
                    {
                        data: {
                            entities: [1, 2, 1],
                            values: [20, 21, 22],
                            years: [2022, 2022, 2024],
                        },
                        metadata: {
                            id: 3,
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                        {
                                            name: "High-income",
                                            id: 2,
                                        },
                                    ],
                                },
                                years: { values: [{ id: 2022 }, { id: 2024 }] },
                            },
                        },
                    },
                ],
            ])

        const legacyGrapherConfig: Partial<LegacyGrapherInterface> = {
            dimensions: [
                {
                    variableId: 2,
                    property: DimensionProperty.y,
                },
                {
                    variableId: 3,
                    property: DimensionProperty.y,
                },
            ],
        }

        const { table } = legacyToOwidTableAndDimensions(
            legacyVariableConfig,
            legacyGrapherConfig
        )

        it("leaves ErrorValues when there were no values to join to", () => {
            // Currently joins may just be partial and have many blank values. CoreTable will fill those in with the
            // appropriate ErrorValue type. It may make sense to change that and normalize keys in this method.
            const worldRows = table.rows.filter(
                (row) => row.entityName === "World"
            )
            expect(worldRows[0]["3"]).toEqual(
                ErrorValueTypes.NoMatchingValueAfterJoin
            )
            expect(worldRows[3]["2"]).toEqual(
                ErrorValueTypes.NoMatchingValueAfterJoin
            )
        })

        it("duplicates 'year' column into 'time'", () => {
            expect(table.columnSlugs).toEqual(
                expect.arrayContaining([
                    OwidTableSlugs.year,
                    OwidTableSlugs.time,
                ])
            )
            expect(
                table.get(OwidTableSlugs.time) instanceof ColumnTypeMap.Year
            ).toBeTruthy()
            expect(table.columnSlugs).not.toContain(OwidTableSlugs.day)
            expect(table.get(OwidTableSlugs.time).valuesAscending).toEqual([
                2020, 2021, 2022, 2022, 2024,
            ])
        })

        it("handles `null` in country codes", () => {
            const highIncomeRows = table.rows.filter(
                (row) => row.entityName === "High-income"
            )
            expect(table.rows.length).toEqual(5)
            expect(highIncomeRows.length).toEqual(1)
        })
    })

    describe("variables with days", () => {
        const legacyVariableConfig: MultipleOwidVariableDataDimensionsMap =
            new Map([
                [
                    2,
                    {
                        data: {
                            entities: [1, 1, 1],
                            values: [8, 9, 10],
                            years: [-5, 0, 1],
                        },
                        metadata: {
                            id: 2,
                            display: {
                                yearIsDay: true,
                                zeroDay: "2020-01-21",
                            },
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                    ],
                                },
                                years: {
                                    values: [
                                        {
                                            id: -5,
                                        },
                                        {
                                            id: 0,
                                        },
                                        {
                                            id: 1,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                [
                    3,
                    {
                        data: {
                            entities: [1, 1],
                            values: [20, 21],
                            years: [-4, -3],
                        },
                        metadata: {
                            id: 3,
                            display: {
                                yearIsDay: true,
                                zeroDay: "2020-01-19",
                            },
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                    ],
                                },
                                years: {
                                    values: [
                                        {
                                            id: -4,
                                        },
                                        {
                                            id: -3,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            ])

        const legacyGrapherConfig = {
            dimensions: [
                {
                    variableId: 2,
                    property: DimensionProperty.y,
                },
                {
                    variableId: 3,
                    property: DimensionProperty.y,
                },
            ],
        }

        const { table } = legacyToOwidTableAndDimensions(
            legacyVariableConfig,
            legacyGrapherConfig
        )

        it("shifts values in days array when zeroDay is is not EPOCH_DATE", () => {
            expect(table.get("2").uniqTimesAsc).toEqual([-5, 0, 1])
            expect(table.get("3").uniqTimesAsc).toEqual([-6, -5])
        })

        it("duplicates 'day' column into 'time'", () => {
            expect(table.columnSlugs).toEqual(
                expect.arrayContaining([
                    OwidTableSlugs.day,
                    OwidTableSlugs.time,
                ])
            )
            expect(
                table.get(OwidTableSlugs.time) instanceof ColumnTypeMap.Day
            ).toBeTruthy()
            expect(table.columnSlugs).not.toContain(OwidTableSlugs.year)
            expect(table.get(OwidTableSlugs.time).valuesAscending).toEqual([
                -6, -5, 0, 1,
            ])
        })
    })

    describe("variables with mixed days & years", () => {
        const legacyVariableConfig: MultipleOwidVariableDataDimensionsMap =
            new Map([
                [
                    2,
                    {
                        data: {
                            entities: [1, 1, 1],
                            values: [8, 9, 10],
                            years: [-5, 0, 1],
                        },
                        metadata: {
                            id: 2,
                            display: {
                                yearIsDay: true,
                                zeroDay: "2020-01-21",
                            },
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                    ],
                                },
                                years: {
                                    values: [
                                        {
                                            id: -5,
                                        },
                                        {
                                            id: 0,
                                        },
                                        {
                                            id: 1,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                [
                    3,
                    {
                        data: {
                            entities: [1, 1],
                            values: [20, 21],
                            years: [2020, 2021],
                        },
                        metadata: {
                            id: 3,
                            dimensions: {
                                entities: {
                                    values: [
                                        {
                                            name: "World",
                                            code: "OWID_WRL",
                                            id: 1,
                                        },
                                    ],
                                },
                                years: {
                                    values: [
                                        {
                                            id: 2020,
                                        },
                                        {
                                            id: 2021,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            ])
        const legacyGrapherConfig: Partial<LegacyGrapherInterface> = {
            dimensions: [
                {
                    variableId: 2,
                    property: DimensionProperty.y,
                },
                {
                    variableId: 3,
                    property: DimensionProperty.y,
                    targetYear: 2022,
                    display: {
                        tolerance: 1,
                    },
                },
            ],
        }

        const { table } = legacyToOwidTableAndDimensions(
            legacyVariableConfig,
            legacyGrapherConfig
        )

        it("duplicates 'day' column into 'time'", () => {
            expect(table.columnSlugs).toEqual(
                expect.arrayContaining([
                    OwidTableSlugs.day,
                    OwidTableSlugs.time,
                ])
            )
            expect(
                table.get(OwidTableSlugs.time) instanceof ColumnTypeMap.Day
            ).toBeTruthy()
            expect(table.get(OwidTableSlugs.time).uniqValues).toEqual([
                -5, 0, 1,
            ])
        })

        describe("scatter-specific behavior", () => {
            it("only joins targetTime on Scatters", () => {
                expect(table.rows.length).toEqual(4)
            })

            it("joins targetTime", () => {
                const scatterLegacyGrapherConfig = {
                    ...legacyGrapherConfig,
                    type: ChartTypeName.ScatterPlot,
                }

                const { table } = legacyToOwidTableAndDimensions(
                    legacyVariableConfig,
                    scatterLegacyGrapherConfig
                )

                expect(table.rows.length).toEqual(3)
                expect(table.columnSlugs.includes("3-2022")).toBeTruthy()
                const column = table.get("3-2022")
                expect(column.valuesIncludingErrorValues).toEqual([21, 21, 21])
                expect(column.originalTimes).toEqual([2021, 2021, 2021])
                expect(column.def.targetTime).toEqual(2022)
            })
        })
    })
})

const getOwidVarSet = (): MultipleOwidVariableDataDimensionsMap => {
    return new Map([
        [
            3512,
            {
                data: {
                    entities: [99, 45, 204],
                    values: [5.5, 4.2, 12.6],
                    years: [1983, 1985, 1985],
                },
                metadata: {
                    id: 3512,
                    name: "Prevalence of wasting, weight for height (% of children under 5)",
                    unit: "% of children under 5",
                    description: "Prevalence of...",
                    shortUnit: "%",
                    display: {
                        name: "Some Display Name",
                    },
                    source: {
                        id: 2174,
                        name: "World Bank - WDI: Prevalence of wasting, weight for height (% of children under 5)",
                        link: "http://data.worldbank.org/data-catalog/world-development-indicators",
                    },
                    dimensions: {
                        entities: {
                            values: [
                                {
                                    name: "Cape Verde",
                                    code: "CPV",
                                    id: 45,
                                },
                                {
                                    name: "Papua New Guinea",
                                    code: "PNG",
                                    id: 99,
                                },
                                {
                                    name: "Kiribati",
                                    code: "KIR",
                                    id: 204,
                                },
                            ],
                        },
                        years: {
                            values: [
                                {
                                    id: 1983,
                                },
                                {
                                    id: 1985,
                                },
                            ],
                        },
                    },
                },
            },
        ],
    ])
}

const getLegacyGrapherConfig = (): Partial<LegacyGrapherInterface> => {
    return {
        dimensions: [
            {
                property: DimensionProperty.y,
                variableId: 3512,
            },
        ],
    }
}

describe("creating a table from legacy", () => {
    const table = legacyToOwidTableAndDimensions(getOwidVarSet(), {
        ...getLegacyGrapherConfig(),
        selectedData: [{ entityId: 45, index: 0, color: "blue" }],
    }).table
    const name =
        "Prevalence of wasting, weight for height (% of children under 5)"

    it("can create a table and detect columns from legacy", () => {
        expect(table.numRows).toEqual(3)
        expect(table.columnSlugs).toEqual([
            "entityName",
            "entityId",
            "entityCode",
            "entityColor",
            "year",
            "3512",
            "time", // todo: what is the best design here?
        ])

        expect(table.columnNames).toEqual([
            "Entity",
            "entityId",
            "Code",
            "entityColor",
            "Year",
            name,
            "time",
        ])

        expect(table.get("3512").displayName).toBe("Some Display Name")
    })

    it("can apply legacy unit conversion factors", () => {
        const varSet = getOwidVarSet()
        varSet.get(3512)!.metadata.display!.conversionFactor = 100
        expect(
            legacyToOwidTableAndDimensions(
                varSet,
                getLegacyGrapherConfig()
            ).table.get("3512")!.values
        ).toEqual([550, 420, 1260])
    })

    it("can apply legacy selection colors", () => {
        expect(table.getColorForEntityName("Cape Verde")).toBe("blue")
        expect(table.getColorForEntityName("Kiribati")).toBe(undefined)
    })

    it("can export legacy to CSV", () => {
        const expected = `Entity,Code,Year,"Prevalence of wasting, weight for height (% of children under 5)"
Cape Verde,CPV,1985,4.2
Kiribati,KIR,1985,12.6
Papua New Guinea,PNG,1983,5.5`
        expect(table.toPrettyCsv()).toEqual(expected)
    })

    it("passes on the non-redistributable flag", () => {
        const varSet = getOwidVarSet()
        varSet.get(3512)!.metadata.nonRedistributable = true
        const columnDef = legacyToOwidTableAndDimensions(
            varSet,
            getLegacyGrapherConfig()
        ).table.get("3512").def as OwidColumnDef
        expect(columnDef.nonRedistributable).toEqual(true)
    })
})
