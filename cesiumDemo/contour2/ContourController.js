// 检查依赖
if (typeof DataPreprocessor === 'undefined' || 
    typeof MarchingSquares === 'undefined' ||
    typeof ContourConnector === 'undefined') {
    throw new Error('Required classes must be loaded first');
}

class ContourController {
    constructor(viewer) {
        this.viewer = viewer;
        this.renderer = new ContourRenderer(viewer);
    }

    drawContours(data, options = {}) {
        try {
            console.log('Input data:', data); // 调试日志

            if (!data || !Array.isArray(data) || !data.length || !data[0].length) {
                console.error('Invalid input data format');
                return;
            }

            const {
                width = data[0].length,
                height = data.length,
                levels = Array.from({length: 10}, (_, i) => i / 9),
            } = options;

            console.log('Processing data with dimensions:', width, height); // 调试日志

            // 1. 数据预处理
            const normalizedData = DataPreprocessor.process(data, width, height);
            if (!normalizedData) {
                console.error('Data preprocessing failed');
                return;
            }

            console.log('Normalized data:', normalizedData); // 调试日志

            // 2-4. 生成并连接等值线
            levels.forEach((level, index) => {
                try {
                    console.log('Processing level:', level); // 调试日志

                    // 生成等值线段
                    const segments = MarchingSquares.getContourLines(normalizedData, level);
                    if (!segments || segments.length === 0) {
                        console.log('No segments generated for level:', level);
                        return;
                    }

                    console.log('Generated segments:', segments.length); // 调试日志

                    // 连接等值线段
                    const contours = ContourConnector.connect(segments);
                    if (!contours || contours.length === 0) {
                        console.log('No contours connected for level:', level);
                        return;
                    }

                    console.log('Connected contours:', contours.length); // 调试日志

                    // 5. 平滑处理
                    const smoothedContours = contours.map(contour => 
                        ContourSmoother.smooth(contour, 0.5)
                    );

                    // 6. 渲染
                    const color = this.getColorForLevel(level);
                    this.renderer.render(smoothedContours, color);
                } catch (error) {
                    console.error(`Error processing level ${level}:`, error);
                }
            });
        } catch (error) {
            console.error('Error in drawContours:', error);
        }
    }

    getColorForLevel(level) {
        try {
            if (level < 0.5) {
                return new Cesium.Color(
                    0,
                    0,
                    1 - level * 2,
                    1
                );
            } else {
                return new Cesium.Color(
                    (level - 0.5) * 2,
                    0,
                    0,
                    1
                );
            }
        } catch (error) {
            console.error('Error generating color:', error);
            return Cesium.Color.WHITE;
        }
    }

    clear() {
        try {
            this.renderer.clear();
        } catch (error) {
            console.error('Error clearing contours:', error);
        }
    }
}

// 导出到全局作用域
window.ContourController = ContourController; 