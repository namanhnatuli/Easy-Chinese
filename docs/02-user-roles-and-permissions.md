# User Roles and Permissions

## Anonymous
Can:
- browse public lessons
- browse public words and grammar
- use learning modes
- view public content pages

Cannot:
- save progress
- access dashboard stats
- favorite/bookmark
- access settings that require account persistence
- access admin pages

## Authenticated user
Can:
- do everything anonymous can do
- save progress
- access statistics
- manage own settings
- review due items
- bookmark/favorite items (optional in phase 2)

Cannot:
- manage content
- access admin routes

## Admin
Can:
- do everything authenticated users can do
- create/update/delete words
- create/update/delete grammar points
- create/update/delete lessons
- manage metadata like topics, radicals, levels, tags
- publish/unpublish content

## Authorization principles
- Enforce permissions at route and data level
- Admin inheritance: admin can perform user capabilities
- Anonymous users must never write protected data