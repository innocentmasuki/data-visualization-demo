'use client'
import React, { useState} from 'react';
import {ChordDiagram, Relationship} from "@/components/diagram";

const Home: React.FC = () => {
    const [relInput, setRelInput] = useState('A1,A1,0\n' +
        'A2,A2,0\n' +
        'A3,A3,0\n' +
        'A4,A4,0\n' +
        'A5,A5,0\n' +
        'A6,A6,0\n' +
        'A7,A7,0\n' +
        '\n' +
        'B1,A1,5\n' +
        'B2,A2,4\n' +
        'B3,A3,6\n' +
        'B4,A4,7\n' +
        'B5,A5,5\n' +
        'B6,A6,3\n' +
        'B7,A7,8\n' +
        'B8,A1,2\n' +
        'B9,A2,9\n' +
        'B10,A3,4\n' +
        'B11,A4,6\n' +
        'B12,A5,5\n' +
        'B13,A6,7\n' +
        'B14,A7,3\n' +
        'B15,A1,4\n' +
        '\n' +
        '\n' +
        'C1,A1,6\n' +
        'C2,A2,5\n' +
        'C3,A3,7\n' +
        'C4,A4,4\n' +
        'C5,A5,8\n' +
        'C6,A6,3\n' +
        'C7,A7,9\n' +
        'C8,A1,5\n' +
        'C9,A2,6\n' +
        'C10,A3,4\n' +
        'C11,A4,5\n' +
        'C12,A5,7\n' +
        'C13,A6,6\n' +
        'C14,A7,4\n' +
        'C15,A1,8\n' +
        'C16,A2,3\n' +
        'C17,A3,5\n' +
        'C18,A4,6');
    const [relationships, setRelationships] = useState<Relationship[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const lines = relInput
            .trim()
            .split('\n')
            .filter((line) => line.trim());
        const parsed: Relationship[] = [];

        for (const line of lines) {
            const parts = line.split(',').map((p) => p.trim());
            if (parts.length !== 3) {
                alert('Each line must be: source,target,value');
                return;
            }
            const [source, target, val] = parts;
            const value = Number(val);
            if (isNaN(value)) {
                alert(`Invalid value: ${val}`);
                return;
            }
            parsed.push({ source, target, value });
        }

        setRelationships(parsed);
    };

    return (
        <div className="p-4 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block mb-1 font-semibold">
                        Relationships (one per line: source,target,value)
                    </label>
                    <textarea
                        value={relInput}
                        onChange={(e) => setRelInput(e.target.value)}
                        className="w-full border rounded p-2 h-48"
                        placeholder={"A,B,5\nB,C,2\nC,A,3"}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Render Diagram
                </button>
            </form>
            <div className="border rounded p-4">
                {relationships.length > 0 ? (
                    <ChordDiagram
                        relationships={relationships}
                        width={500}
                        height={500}
                    />
                ) : (
                    <p className="text-gray-500">
                        Enter relationships above to see the chord diagram.
                    </p>
                )}
            </div>
        </div>
    );
};

export default Home;
