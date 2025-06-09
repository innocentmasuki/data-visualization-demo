'use client'
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export type Relationship = {
    source: string;
    target: string;
    value: number;
};

export type ChordDiagramProps = {
    relationships: Relationship[];
    colors?: string[];
    width?: number;
    height?: number;
};
export const ChordDiagram: React.FC<ChordDiagramProps> = ({
                                                              relationships,
                                                              colors,
                                                              width = 600,
                                                              height = 600,
                                                          }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!relationships || relationships.length === 0) return;

        // derive unique entities
        const entities = Array.from(
            new Set(
                relationships.flatMap((r) => [r.source, r.target])
            )
        );
        const indexMap = new Map(entities.map((e, i) => [e, i]));
        const n = entities.length;

        // build a square matrix from relationships
        const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
        relationships.forEach(({ source, target, value }) => {
            const i = indexMap.get(source)!;
            const j = indexMap.get(target)!;
            matrix[i][j] = value;
        });

        const innerRadius = Math.min(width, height) * 0.5 - 40;
        const outerRadius = innerRadius + 10;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        const g = svg.select('g');

        // compute chord layout
        const chordData = d3
            .chord()
            .padAngle(0.05)
            .sortSubgroups(d3.descending)(matrix);

        // color scale
        const colorScale = d3
            .scaleOrdinal<string>()
            .domain(entities)
            .range(
                colors && colors.length >= entities.length
                    ? colors
                    : d3.schemeCategory10
            );

        // draw groups (outer arcs)
        const group = g
            .selectAll('g.group')
            .data(chordData.groups)
            .enter()
            .append('g')
            .attr('class', 'group');

        group
            .append('path')
            .attr('class', 'arc')
            .attr(
                'd',
                d3
                    .arc()
                    .innerRadius(innerRadius)
                    .outerRadius(outerRadius) as any
            )
            .attr('fill', (d) => colorScale(entities[d.index]))
            .attr(
                'stroke',
                (d) => d3.rgb(colorScale(entities[d.index])).darker().toString()
            );

        // add entity labels
        group
            .append('text')
            .each((d) => {
                (d as any).angle = (d.startAngle + d.endAngle) / 2;
            })
            .attr('dy', '.35em')
            .attr('transform', (d) => {
                const angle = (d as any).angle;
                const rotate = (angle * 180) / Math.PI - 90;
                const translate = outerRadius + 10;
                return `rotate(${rotate}) translate(${translate}) ${
                    angle > Math.PI ? 'rotate(180)' : ''
                }`;
            })
            .attr('text-anchor', (d) =>
                (d as any).angle > Math.PI ? 'end' : 'start'
            )
            .text((d) => entities[d.index]);

        // draw ribbons (inner links)
        const ribbons = g
            .append('g')
            .attr('class', 'ribbons')
            .selectAll('path')
            .data(chordData)
            .enter()
            .append('path')
            .attr('class', 'ribbon')
            .attr('d', d3.ribbon().radius(innerRadius) as any)
            .attr('fill', (d) => colorScale(entities[d.target.index]))
            .attr('stroke', (d) =>
                d3
                    .rgb(colorScale(entities[d.target.index]))
                    .darker()
                    .toString()
            )
            .attr('opacity', 0.8);

        // add hover tooltip via <title>
        ribbons.append('title').text(
            (d) =>
                `${entities[d.source.index]} → ${entities[d.target.index]}: ${d.source.value}`
        );

        // tailwind styling
        svg.selectAll('.arc').classed('transition-colors duration-200', true);
        svg.selectAll('.ribbon').classed('cursor-pointer hover:opacity-100', true);
    }, [relationships, colors, width, height]);

    return (
        <div className="w-full h-full flex justify-center items-center relative">
            <svg ref={svgRef} className="max-w-full max-h-full" />
        </div>
    );
};
