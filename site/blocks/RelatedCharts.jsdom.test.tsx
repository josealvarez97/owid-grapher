#! /usr/bin/env jest

import React from "react"
import { RelatedCharts } from "./RelatedCharts.js"

import { configure, mount } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import {
    BAKED_BASE_URL,
    BAKED_GRAPHER_EXPORTS_BASE_URL,
} from "../../settings/clientSettings.js"
configure({ adapter: new Adapter() })

const charts = [
    {
        title: "Chart 1",
        slug: "chart-1",
    },
    {
        title: "Chart 2",
        slug: "chart-2",
    },
]

it("renders active chart links and loads respective chart on click", () => {
    const wrapper = mount(<RelatedCharts charts={charts} />)

    expect(wrapper.find("li")).toHaveLength(2)

    expect(wrapper.find("li").first().hasClass("active")).toEqual(true)
    expect(wrapper.find("li").first().text()).toBe("Chart 1")
    expect(
        wrapper
            .find("li")
            .first()
            .find(
                `img[src="${BAKED_GRAPHER_EXPORTS_BASE_URL}/${charts[0].slug}.svg"]`
            )
    ).toHaveLength(1)

    wrapper.find("a").forEach((link, idx) => {
        link.simulate("click")
        expect(wrapper.find("figure")).toHaveLength(1)
        expect(
            wrapper.find(
                `figure[data-grapher-src="${BAKED_BASE_URL}/grapher/${charts[idx].slug}"]`
            )
        ).toHaveLength(1)
        // should have forced re-render by changing the `key`
        expect(wrapper.find("figure").key()).toEqual(charts[idx].slug)
    })

    expect(wrapper.find("li").last().hasClass("active")).toEqual(true)
})
