import { PublicController } from '../controllers/publicController.js';

export function registerPublicRoutes(app, ctx) {
  const { currentUser, sb, one } = ctx;
  const publicController = new PublicController(sb, one, currentUser);

  app.get('/', (req, res) => publicController.getHome(req, res));
  app.get('/deploy', (req, res) => publicController.getDeploy(req, res));
  app.get('/staffing', (req, res) => publicController.getStaffing(req, res));
  app.get('/staffing/:id', (req, res) => publicController.getStaffingById(req, res));
  app.get('/referrals', (req, res) => publicController.getReferrals(req, res));
}
