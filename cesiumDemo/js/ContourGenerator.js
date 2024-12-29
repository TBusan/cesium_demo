class ContourGenerator {
    constructor(viewer) {
        this.viewer = viewer;
        this.entities = [];
    }

    // 生成示例数据
    generateSampleData(width, height, centerLon, centerLat, spacing) {
        const data = [];
        for (let i = 0; i < height; i++) {
            const row = [];
            for (let j = 0; j < width; j++) {
                const lon = centerLon - (width/2 * spacing) + (j * spacing);
                const lat = centerLat - (height/2 * spacing) + (i * spacing);
                // 使用高斯函数生成示例数据
                const value = Math.exp(-((lon - centerLon)**2 + (lat - centerLat)**2) / (2 * spacing));
                row.push(value);
            }
            data.push(row);
        }
        return data;
    }

    // 创建等值线实体
    createContourEntity(contourPoints, height, color) {
        const positions = [];
        contourPoints.forEach(point => {
            positions.push(Cesium.Cartesian3.fromDegrees(point[0], point[1], height));
        });

        const entity = this.viewer.entities.add({
            polyline: {
                positions: positions,
                width: 2,
                material: color,
                clampToGround: true
            }
        });

        this.entities.push(entity);
        return entity;
    }

    // 绘制等值线
    drawContours(options = {}) {
        const {
            width = 50,
            height = 50,
            centerLon = 116.391,
            centerLat = 39.901,
            spacing = 0.01,
            levels = [0.2, 0.4, 0.6, 0.8],
            contourHeight = 1000
        } = options;

        // 生成网格数据
        const data = this.generateSampleData(width, height, centerLon, centerLat, spacing);

        // 为每个等值线级别生成轮廓
        levels.forEach((level, index) => {
            // 使用 MarchingSquares 生成等值线
            const contours = MarchingSquares.isoContours(data, level);

            // 转换等值线坐标
            contours.forEach(contour => {
                const contourPoints = contour.map(point => {
                    const lon = centerLon - (width/2 * spacing) + (point[0] * spacing);
                    const lat = centerLat - (height/2 * spacing) + (point[1] * spacing);
                    return [lon, lat];
                });

                // 创建等值线实体
                const color = Cesium.Color.fromHsl((index * 0.25) % 1.0, 1.0, 0.5);
                this.createContourEntity(contourPoints, contourHeight, color);
            });
        });
    }

    // 清除所有等值线
    clearContours() {
        this.entities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.entities = [];
    }

    // 使用真实数据生成等值线
    drawContoursFromData(data, options = {}) {
        const {
            bounds = {
                west: 116.0,
                south: 39.5,
                east: 117.0,
                north: 40.5
            },
            levels = [0.2, 0.4, 0.6, 0.8],
            contourHeight = 1000
        } = options;

        const width = data[0].length;
        const height = data.length;
        const lonSpacing = (bounds.east - bounds.west) / (width - 1);
        const latSpacing = (bounds.north - bounds.south) / (height - 1);

        levels.forEach((level, index) => {
            const contours = MarchingSquares.isoContours(data, level);

            contours.forEach(contour => {
                const contourPoints = contour.map(point => {
                    const lon = bounds.west + point[0] * lonSpacing;
                    const lat = bounds.south + point[1] * latSpacing;
                    return [lon, lat];
                });

                const color = Cesium.Color.fromHsl((index * 0.25) % 1.0, 1.0, 0.5);
                this.createContourEntity(contourPoints, contourHeight, color);
            });
        });
    }
} 