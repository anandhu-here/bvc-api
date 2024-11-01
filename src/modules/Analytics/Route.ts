import { Router } from "express";
import AuthMiddleware from "src/middlewares/AuthMiddleware";
import { Permission } from "src/configs/Permissions";
import AgencyAnalyticsController from "./AnalyticsController";

const AnalyticsRouter: Router = Router();
const _analyticsController = new AgencyAnalyticsController();

// Apply authentication middleware to all routes
AnalyticsRouter.use(AuthMiddleware.authenticateToken);
// Ensure user belongs to an agency organization

/**
 * @name AgencyAnalyticsController.getDashboardMetrics
 * @description Get all dashboard metrics for agency overview
 * @route GET /api/v1/analytics/dashboard
 * @access private
 * @returns {Object} Dashboard metrics including staff, shifts, revenue, and care home data
 */
AnalyticsRouter.route("/dashboard").get(
  _analyticsController.getDashboardMetrics
);

/**
 * @name AgencyAnalyticsController.getStaffMetrics
 * @description Get detailed staff metrics and statistics
 * @route GET /api/v1/analytics/staff
 * @access private
 * @returns {Object} Staff metrics including utilization and specialization breakdown
 */
AnalyticsRouter.route("/staff").get(_analyticsController.getStaffMetrics);

/**
 * @name AgencyAnalyticsController.getShiftMetrics
 * @description Get comprehensive shift statistics
 * @route GET /api/v1/analytics/shifts
 * @access private
 * @returns {Object} Shift metrics including fill rates and completion rates
 */
AnalyticsRouter.route("/shifts").get(_analyticsController.getShiftMetrics);

/**
 * @name AgencyAnalyticsController.getRevenueMetrics
 * @description Get detailed revenue analysis
 * @route GET /api/v1/analytics/revenue
 * @access private
 * @returns {Object} Revenue metrics including current month, growth, and breakdown
 */
AnalyticsRouter.route("/revenue").get(_analyticsController.getRevenueMetrics);

/**
 * @name AgencyAnalyticsController.getCareHomeMetrics
 * @description Get care home relationship statistics
 * @route GET /api/v1/analytics/care-homes
 * @access private
 * @returns {Object} Care home metrics including active homes and shift distribution
 */
AnalyticsRouter.route("/care-homes").get(
  _analyticsController.getCareHomeMetrics
);

/**
 * @name AgencyAnalyticsController.getStaffingDemandTrends
 * @description Get staffing demand trends over time
 * @route GET /api/v1/analytics/staffing-trends
 * @access private
 * @query {string} period - 'week' or 'month'
 * @returns {Array} Staffing demand data points over the specified period
 */
AnalyticsRouter.route("/staffing-trends").get(
  _analyticsController.getStaffingDemandTrends
);

/**
 * @name AgencyAnalyticsController.getUpcomingRequirements
 * @description Get upcoming shift requirements and urgent needs
 * @route GET /api/v1/analytics/upcoming-requirements
 * @access private
 * @returns {Array} List of upcoming shift requirements with urgency levels
 */
AnalyticsRouter.route("/upcoming-requirements").get(
  _analyticsController.getUpcomingRequirements
);

export default AnalyticsRouter;
