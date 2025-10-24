'use client'
import React, {useEffect, useRef} from 'react'
import * as d3 from 'd3'

export type Relationship = {
    source: string
    target: string
    value: number
}

export type ChordDiagramProps = {
    relationships: Relationship[]
    colors?: string[]
    width?: number
    height?: number
    id?: string
}

export const ChordDiagram: React.FC<ChordDiagramProps> = (
    {
        relationships,
        colors,
        width = 900,
        height = 600,
        id,
    }) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Always clear previous drawing so we don't show stale charts when data changes or becomes empty
        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()
        const tt = tooltipRef.current
        if (tt) tt.style.display = 'none'

        if (!relationships.length) return

        const margin = {top: 150, right: 80, bottom: 250, left: 20}
        const totalWidth = width + margin.left + margin.right
        const totalHeight = height + margin.top + margin.bottom

        let entities = Array.from(
            new Set(relationships.flatMap((r) => [r.source, r.target]))
        )

        entities = entities.sort((a, b) => {
            const prefixA = a.match(/^([A-Z][0-9]+)/)?.[0] || a;
            const prefixB = b.match(/^([A-Z][0-9]+)/)?.[0] || b;

            const categoryA = prefixA.charAt(0);
            const categoryB = prefixB.charAt(0);

            if (categoryA !== categoryB) {
                return categoryA.localeCompare(categoryB);
            }

            return prefixA.localeCompare(prefixB);
        });

        const indexMap = new Map(entities.map((e, i) => [e, i]))
        const n = entities.length

        const matrix: number[][] = Array.from({length: n}, () =>
            Array(n).fill(0)
        )
        relationships.forEach(({source, target, value}) => {
            matrix[indexMap.get(source)!][indexMap.get(target)!] = value
        })

        const innerRadius = Math.min(width, height) * 0.5 - 40
        const outerRadius = innerRadius + 10

        svg
            .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .classed('w-full h-full', true)

        const centerX = margin.left + width / 2
        const centerY = margin.top + height / 2

        const g = svg
            .append('g')
            .attr('transform', `translate(${centerX},${centerY})`)

        const chordData = d3
            .chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)(matrix)

        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(entities)
            .range(
                colors && colors.length >= entities.length ? colors : d3.schemeCategory10
            )

        const group = g
            .selectAll('g.group')
            .data(chordData.groups)
            .join('g')
            .attr('class', 'group')

        group
            .append('path')
            .attr('class', 'arc transition-colors duration-200')
            .attr(
                'd',
                d3.arc().innerRadius(innerRadius).outerRadius(outerRadius) as any
            )
            .attr('fill', (d) => colorScale(entities[d.index]))
            .attr(
                'stroke',
                (d) => d3.rgb(colorScale(entities[d.index])).darker().toString()
            )

        group
            .append('text')
            .each((d) => {
                ;(d as any).angle = (d.startAngle + d.endAngle) / 2
            })
            .attr('dy', '.35em')
            .attr('class', 'chord-label')
            .attr('transform', (d) => {
                const angle = (d as any).angle
                const rotate = (angle * 180) / Math.PI - 90
                const translate = outerRadius + 10
                return `rotate(${rotate}) translate(${translate}) ${
                    angle > Math.PI ? 'rotate(180)' : ''
                }`
            })
            .attr('text-anchor', (d) =>
                (d as any).angle > Math.PI ? 'end' : 'start'
            )
            .text((d) => entities[d.index])
            .attr('fill', d => {
                const label = entities[d.index];
                if (/^(0[1-9]|1[0-8])\b/.test(label)) {
                    return 'blue';
                } else if(/^[A-Z]\./.test(label)) {
                    return 'darkgreen';
                } else {
                    return 'green';
                }
            })
            .attr('font-weight', d => {
                const label = entities[d.index];
                if (/^(0[1-9]|1[0-8])\b/.test(label)) {
                    return 'bold';
                } else
                if (/^[A-Z]\./.test(label)) {
                    return 'bold';
                } else {
                    return 'normal';
                }
            })

        // draw ribbons
        const ribbons = g
            .append('g')
            .attr('class', 'ribbons')
            .selectAll('path')
            .data(chordData)
            .join('path')
            .attr('class', 'ribbon cursor-pointer hover:opacity-100')
            .attr('d', d3.ribbon().radius(innerRadius) as any)
            .attr('fill', (d) => colorScale(entities[d.target.index]))
            .attr(
                'stroke',
                (d) => d3.rgb(colorScale(entities[d.target.index])).darker().toString()
            )
            .attr('opacity', 0.8)

        ribbons
            .on('mouseover', (event, d) => {
                const tt = tooltipRef.current
                if (!tt) return
                tt.style.display = 'block'
                tt.innerHTML = `
          <div><strong>${entities[d.source.index]}</strong> → <strong>${entities[d.target.index]}</strong></div>
        `
            })
            .on('mousemove', (event) => {
                const tt = tooltipRef.current
                if (!tt) return
                tt.style.left = `${event.pageX - 10}px`
                tt.style.top = `${event.pageY - 50}px`
            })
            .on('mouseout', () => {
                const tt = tooltipRef.current
                if (tt) tt.style.display = 'none'
            })


    }, [relationships, colors, width, height])

    return (
        <div className="w-full h-full relative">
            <svg ref={svgRef} id={id} />
            <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-gray-700 text-white text-xs rounded px-2 py-1 shadow-md"
                style={{display: 'none', position: 'absolute', zIndex: 10}}
            />
        </div>
    )
}
