// 基础工具类
class ContourUtils {
    static validateData(data) {
        return data && Array.isArray(data) && data.length > 0 && Array.isArray(data[0]);
    }

    static pointsEqual(p1, p2) {
        return Math.abs(p1[0] - p2[0]) < 1e-10 && Math.abs(p1[1] - p2[1]) < 1e-10;
    }
}

// 导出到全局作用域
window.ContourUtils = ContourUtils; 