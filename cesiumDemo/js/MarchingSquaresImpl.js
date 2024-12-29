class MarchingSquares {
    static isoLines(data, threshold) {
        const lines = [];
        const rows = data.length;
        const cols = data[0].length;

        for (let i = 0; i < rows - 1; i++) {
            for (let j = 0; j < cols - 1; j++) {
                const cell = [
                    data[i][j],        // top left
                    data[i][j + 1],    // top right
                    data[i + 1][j + 1],// bottom right
                    data[i + 1][j]     // bottom left
                ];

                const cellCase = this.getCellCase(cell, threshold);
                const segments = this.getLineSegments(cellCase, i, j);
                if (segments.length > 0) {
                    lines.push(...segments);
                }
            }
        }

        return this.connectLines(lines);
    }

    static getCellCase(cell, threshold) {
        let caseIndex = 0;
        for (let i = 0; i < 4; i++) {
            if (cell[i] >= threshold) {
                caseIndex |= (1 << i);
            }
        }
        return caseIndex;
    }

    static getLineSegments(caseIndex, row, col) {
        const segments = [];
        const points = [
            [row, col + 0.5],     // top
            [row + 0.5, col + 1], // right
            [row + 1, col + 0.5], // bottom
            [row + 0.5, col]      // left
        ];

        switch (caseIndex) {
            case 1:  case 14: segments.push([points[3], points[0]]); break;
            case 2:  case 13: segments.push([points[0], points[1]]); break;
            case 3:  case 12: segments.push([points[3], points[1]]); break;
            case 4:  case 11: segments.push([points[1], points[2]]); break;
            case 6:  case 9:  segments.push([points[0], points[2]]); break;
            case 7:  case 8:  segments.push([points[3], points[2]]); break;
            case 5:
                segments.push([points[3], points[0]]);
                segments.push([points[1], points[2]]);
                break;
            case 10:
                segments.push([points[0], points[1]]);
                segments.push([points[2], points[3]]);
                break;
        }
        return segments;
    }

    static connectLines(segments) {
        const contours = [];
        let currentContour = [];
        
        while (segments.length > 0) {
            if (currentContour.length === 0) {
                currentContour = segments.pop();
                contours.push(currentContour);
            }
            
            const lastPoint = currentContour[currentContour.length - 1];
            let foundConnection = false;
            
            for (let i = segments.length - 1; i >= 0; i--) {
                const segment = segments[i];
                if (this.pointsEqual(lastPoint, segment[0])) {
                    currentContour.push(segment[1]);
                    segments.splice(i, 1);
                    foundConnection = true;
                    break;
                } else if (this.pointsEqual(lastPoint, segment[1])) {
                    currentContour.push(segment[0]);
                    segments.splice(i, 1);
                    foundConnection = true;
                    break;
                }
            }
            
            if (!foundConnection) {
                currentContour = [];
            }
        }
        
        return contours;
    }

    static pointsEqual(p1, p2) {
        return Math.abs(p1[0] - p2[0]) < 1e-10 && Math.abs(p1[1] - p2[1]) < 1e-10;
    }
} 