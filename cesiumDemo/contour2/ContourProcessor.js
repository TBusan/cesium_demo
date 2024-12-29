// 确保在文件开头检查依赖
if (typeof ContourUtils === 'undefined') {
    throw new Error('ContourUtils must be loaded first');
}

// 1. 数据预处理类
class DataPreprocessor {
    static process(data, width, height) {
        if (!ContourUtils.validateData(data)) {
            console.error('Invalid data format in DataPreprocessor');
            return null;
        }

        // 数据归一化
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                min = Math.min(min, data[i][j]);
                max = Math.max(max, data[i][j]);
            }
        }

        // 归一化数据到 [0,1] 范围
        const normalizedData = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                row.push((data[i][j] - min) / (max - min));
            }
            normalizedData.push(row);
        }
        return normalizedData;
    }
}

// 2. Marching Squares 算法实现
class MarchingSquares {
    static getContourLines(data, level) {
        if (!data || !data.length || !data[0] || !data[0].length) {
            console.error('Invalid data provided to getContourLines');
            return [];
        }

        const width = data[0].length;
        const height = data.length;
        const lines = [];
        const visited = Array(height).fill().map(() => Array(width).fill(false));

        for (let i = 0; i < height - 1; i++) {
            for (let j = 0; j < width - 1; j++) {
                if (!visited[i][j]) {
                    const cell = [
                        data[i][j],
                        data[i][j + 1],
                        data[i + 1][j + 1],
                        data[i + 1][j]
                    ];
                    const contourSegments = this.processCell(cell, i, j, level);
                    if (contourSegments && contourSegments.length > 0) {
                        lines.push(...contourSegments);
                        visited[i][j] = true;
                    }
                }
            }
        }
        return lines;
    }

    static processCell(cell, row, col, level) {
        let caseIndex = 0;
        for (let i = 0; i < 4; i++) {
            if (cell[i] >= level) caseIndex |= (1 << i);
        }
        return this.getCaseSegments(caseIndex, row, col, cell, level);
    }

    // 3. 线性插值计算
    static interpolate(v1, v2, level) {
        return (level - v1) / (v2 - v1);
    }

    static getCaseSegments(caseIndex, row, col, cell, level) {
        const segments = [];
        const points = [
            [row, col + this.interpolate(cell[0], cell[1], level)],     // 上边
            [row + this.interpolate(cell[1], cell[2], level), col + 1], // 右边
            [row + 1, col + this.interpolate(cell[3], cell[2], level)], // 下边
            [row + this.interpolate(cell[0], cell[3], level), col]      // 左边
        ];

        switch (caseIndex) {
            case 1:
            case 14:
                segments.push([points[3], points[0]]);
                break;
            case 2:
            case 13:
                segments.push([points[0], points[1]]);
                break;
            case 3:
            case 12:
                segments.push([points[3], points[1]]);
                break;
            case 4:
            case 11:
                segments.push([points[1], points[2]]);
                break;
            case 6:
            case 9:
                segments.push([points[0], points[2]]);
                break;
            case 7:
            case 8:
                segments.push([points[3], points[2]]);
                break;
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
}

// 4. 等值线连接器
class ContourConnector {
    static connect(segments) {
        const contours = [];
        let currentContour = [];
        
        while (segments.length > 0) {
            if (currentContour.length === 0) {
                currentContour = segments.pop();
                contours.push(currentContour);
                continue;
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

// 5. 平滑处理器
class ContourSmoother {
    static smooth(points, tension = 0.5) {
        if (points.length < 3) return points;

        const smoothed = [];
        const len = points.length;

        for (let i = 0; i < len; i++) {
            const prev = points[(i - 1 + len) % len];
            const curr = points[i];
            const next = points[(i + 1) % len];

            smoothed.push([
                curr[0] + (prev[0] + next[0] - 2 * curr[0]) * tension,
                curr[1] + (prev[1] + next[1] - 2 * curr[1]) * tension
            ]);
        }
        return smoothed;
    }
}

// 6. 渲染优化器
class ContourRenderer {
    constructor(viewer) {
        this.viewer = viewer;
        this.entities = [];
    }

    render(contours, color, height = 1000) {
        if (!contours || !Array.isArray(contours)) {
            console.error('Invalid contours data');
            return;
        }

        contours.forEach(contour => {
            if (!contour || !Array.isArray(contour)) return;

            try {
                // 转换坐标到地理坐标
                const positions = contour.map(point => {
                    if (!point || point.length < 2) return null;
                    return Cesium.Cartesian3.fromDegrees(
                        116.391 + point[1] * 0.01,  // 经度
                        39.901 + point[0] * 0.01,   // 纬度
                        height
                    );
                }).filter(pos => pos !== null);

                if (positions.length < 2) return;

                const entity = this.viewer.entities.add({
                    polyline: {
                        positions: positions,
                        width: 2,
                        material: new Cesium.PolylineOutlineMaterialProperty({
                            color: color,
                            outlineWidth: 0
                        }),
                        clampToGround: false
                    }
                });
                this.entities.push(entity);
            } catch (error) {
                console.error('Error rendering contour:', error);
            }
        });
    }

    clear() {
        this.entities.forEach(entity => {
            try {
                this.viewer.entities.remove(entity);
            } catch (error) {
                console.error('Error removing entity:', error);
            }
        });
        this.entities = [];
    }
}

// 7. 标签处理器
class ContourLabeler {
    constructor(viewer) {
        this.viewer = viewer;
        this.labels = [];
    }

    addLabels(contours, value, height = 1000) {
        if (!contours || !Array.isArray(contours)) {
            console.error('Invalid contours data');
            return;
        }

        contours.forEach(contour => {
            try {
                const center = this.calculateContourCenter(contour);
                if (!center) return;

                const label = this.viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(
                        116.391 + center[1] * 0.01,
                        39.901 + center[0] * 0.01,
                        height + 10
                    ),
                    label: {
                        text: value.toFixed(2),
                        font: '14px sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        outlineWidth: 2,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                        pixelOffset: new Cesium.Cartesian2(0, 0),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    }
                });
                this.labels.push(label);
            } catch (error) {
                console.error('Error adding label:', error);
            }
        });
    }

    calculateContourCenter(contour) {
        if (!contour || !Array.isArray(contour) || contour.length === 0) return null;

        try {
            let sumX = 0, sumY = 0;
            contour.forEach(point => {
                if (!point || point.length < 2) return;
                sumX += point[0];
                sumY += point[1];
            });
            return [sumX / contour.length, sumY / contour.length];
        } catch (error) {
            console.error('Error calculating center:', error);
            return null;
        }
    }

    clear() {
        this.labels.forEach(label => {
            try {
                this.viewer.entities.remove(label);
            } catch (error) {
                console.error('Error removing label:', error);
            }
        });
        this.labels = [];
    }
}

// 导出所有类到全局作用域
window.DataPreprocessor = DataPreprocessor;
window.MarchingSquares = MarchingSquares;
window.ContourConnector = ContourConnector;
window.ContourSmoother = ContourSmoother;
window.ContourRenderer = ContourRenderer;
window.ContourLabeler = ContourLabeler; 