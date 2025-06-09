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
}

export const ChordDiagram: React.FC<ChordDiagramProps> = (
    {
        relationships,
        colors,
        width = 900,
        height = 600,
    }) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const tooltipRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!relationships.length) return

        // 1) define margins
        const margin = {top: 40, right: 20, bottom: 40, left: 20}
        // 2) compute total internal size
        const totalWidth = width + margin.left + margin.right
        const totalHeight = height + margin.top + margin.bottom

        // derive unique entities
        let entities = Array.from(
            new Set(relationships.flatMap((r) => [r.source, r.target]))
        )

        // Sort entities to group by prefix and prioritize C2 items
        entities = entities.sort((a, b) => {
            // Extract the prefix (e.g., "C1", "C2", "D1", etc.)
            const prefixA = a.match(/^([A-Z][0-9]+)/)?.[0] || a;
            const prefixB = b.match(/^([A-Z][0-9]+)/)?.[0] || b;

            // First, prioritize C2 items
            if (prefixA === 'C2' && prefixB !== 'C2') return -1;
            if (prefixA !== 'C2' && prefixB === 'C2') return 1;

            // Then, group by the first character of the prefix (C, D, E, etc.)
            const categoryA = prefixA.charAt(0);
            const categoryB = prefixB.charAt(0);

            if (categoryA !== categoryB) {
                return categoryA.localeCompare(categoryB);
            }

            // Finally, sort by the full prefix
            return prefixA.localeCompare(prefixB);
        });

        const indexMap = new Map(entities.map((e, i) => [e, i]))
        const n = entities.length

        // build matrix
        const matrix: number[][] = Array.from({length: n}, () =>
            Array(n).fill(0)
        )
        relationships.forEach(({source, target, value}) => {
            matrix[indexMap.get(source)!][indexMap.get(target)!] = value
        })

        // radii based on drawable area
        const innerRadius = Math.min(width, height) * 0.5 - 40
        const outerRadius = innerRadius + 10

        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        // 3) expand viewBox with margin
        svg
            .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .classed('w-full h-full', true)

        // 4) translate to padded center
        const centerX = margin.left + width / 2
        const centerY = margin.top + height / 2

        const g = svg
            .append('g')
            .attr('transform', `translate(${centerX},${centerY})`)

        // generate chords
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

        // draw group arcs
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

        // draw labels
        group
            .append('text')
            .each((d) => {
                ;(d as any).angle = (d.startAngle + d.endAngle) / 2
            })
            .attr('dy', '.35em')
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
          <div>Value: ${d.source.value}</div>
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

        // Add legend
        // const legendItemHeight = 20;
        // const legendItemWidth = 150;
        // const legendPadding = 10;
        // const legendItemsPerRow = 2; // Display 2 items per row
        // const maxLegendItems = 20; // Limit the number of items to avoid an overly large legend
        //
        // // Get the most important entities (prioritize C2 and limit the total)
        // const legendEntities = entities.slice(0, maxLegendItems);
        //
        // // Calculate the number of rows needed
        // const legendRows = Math.ceil(legendEntities.length / legendItemsPerRow);
        // const legendWidth = (legendItemWidth * legendItemsPerRow) + (legendPadding * 2);
        // const legendHeight = (legendRows * legendItemHeight) + legendPadding * 3 + 20; // Extra space for title
        //
        // // Create legend container in the bottom right
        // const legend = svg.append('g')
        //     .attr('class', 'legend')
        //     .attr('transform', `translate(${totalWidth - legendWidth - 20}, ${totalHeight - legendHeight - 20})`);
        //
        // // Add background for better visibility
        // legend.append('rect')
        //     .attr('width', legendWidth)
        //     .attr('height', legendHeight)
        //     .attr('fill', 'white')
        //     .attr('opacity', 0.9)
        //     .attr('rx', 5)
        //     .attr('ry', 5)
        //     .attr('stroke', '#ccc')
        //     .attr('stroke-width', 1);
        //
        // // Add legend title
        // legend.append('text')
        //     .attr('x', legendPadding)
        //     .attr('y', legendPadding + 15)
        //     .attr('font-size', '12px')
        //     .attr('font-weight', 'bold')
        //     .text('Legend');
        //
        // // Add legend items
        // legendEntities.forEach((entity, i) => {
        //     const row = Math.floor(i / legendItemsPerRow);
        //     const col = i % legendItemsPerRow;
        //
        //     const itemGroup = legend.append('g')
        //         .attr('transform', `translate(${col * legendItemWidth + legendPadding}, ${row * legendItemHeight  + 20})`);
        //
        //     // Add color box
        //     itemGroup.append('rect')
        //         .attr('width', 12)
        //         .attr('height', 12)
        //         .attr('fill', colorScale(entity))
        //         .attr('stroke', d3.rgb(colorScale(entity)).darker().toString());
        //
        //     // Add entity name
        //     itemGroup.append('text')
        //         .attr('x', 16)
        //         .attr('y', 10)
        //         .attr('font-size', '10px')
        //         .text(entity.length > 18 ? entity.substring(0, 15) + '...' : entity);
        // });
    }, [relationships, colors, width, height])

    return (
        <div className="w-full h-full relative">
            <svg ref={svgRef}/>
            <div
                ref={tooltipRef}
                className="absolute pointer-events-none bg-gray-700 text-white text-xs rounded px-2 py-1 shadow-md"
                style={{display: 'none', position: 'absolute', zIndex: 10}}
            />
        </div>
    )
}
