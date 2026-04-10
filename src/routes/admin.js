import { AdminController } from '../controllers/adminController.js';

export function registerAdminRoutes(app, ctx) {
  const { sb, one, requireAuth } = ctx;
  const adminController = new AdminController(sb, one);

  app.get('/admin', requireAuth, (req, res) => adminController.getAdmin(req, res));
  app.post('/admin/roles', requireAuth, (req, res) => adminController.postAddRole(req, res));
  app.post('/admin/roles/:id/update', requireAuth, (req, res) => adminController.postUpdateRole(req, res));
  app.post('/admin/roles/:id/delete', requireAuth, (req, res) => adminController.postDeleteRole(req, res));
  app.post('/admin/staffing-role-page-content', requireAuth, (req, res) => adminController.postCMSContent(req, res));
}
