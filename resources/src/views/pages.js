export default {
  'index': () => import('@v/Index'),
  'menus/create': () => import('@v/menus/Create'),
  'menus': () => import('@v/menus/Index'),
  'menus/:id(\\d+)/edit': () => import('@v/menus/Edit'),
}
