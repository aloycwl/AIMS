import { page } from '../lib/render.js';

export function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send(page('Error', `
    <section class='panel'>
      <h2>Something went wrong!</h2>
      <p>${err.message}</p>
      <a href="/" class="btn">Back to Home</a>
    </section>
  `, req.user));
}
