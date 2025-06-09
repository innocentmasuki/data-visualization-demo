import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const csvContent = await request.text()

    // Validate CSV format
    const lines = csvContent.trim().split('\n')
    for (const line of lines) {
      const parts = line.split(',')
      if (parts.length !== 3) {
        return NextResponse.json(
          { error: `Invalid format in line: ${line}` },
          { status: 400 }
        )
      }
      if (isNaN(Number(parts[2]))) {
        return NextResponse.json(
          { error: `Value must be a number in line: ${line}` },
          { status: 400 }
        )
      }
    }

    // Save the file
    const filePath = path.join(process.cwd(), 'public', 'data', 'relationships.csv')
    fs.writeFileSync(filePath, csvContent)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving CSV:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save CSV' },
      { status: 500 }
    )
  }
}
