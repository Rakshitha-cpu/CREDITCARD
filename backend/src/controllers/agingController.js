import { AgingService } from '../services/agingService.js';

export const getAgingReport = async (req, res, next) => {
  try {
    const { customerId } = req.query;
    const summary = await AgingService.getAgingSummary(customerId);
    const customerWise = await AgingService.getCustomerWiseAging();

    return res.json({
      success: true,
      summary,
      customerWise,
    });
  } catch (error) {
    next(error);
  }
};
