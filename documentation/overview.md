# Overview

Moduls:

- User management
- Post management
- Multiple Dashboards (User and Admin)

### User Management

create a user table, complete with auth (make use of UserService in Elysia backend)
Columns:

- fname
- lname
- email (nullable, international format)
- password
- phone (nullable, international format)
- email_verified_at (nullable)
- phone_verified_at (nullable)
- role (an enum of USER, ADMIN, LOCKED. Default: USER)
- status (an enum of ACTIVE, BANNES, SUSPENDED, LOCKED. Default: ACTIVE)
- banned_at (nullable)
- locked_until (nullable, date)

And any other column field required.
Non-active user accounts should not be able to login. instead, be shown a the respective violation (they should be recorded in an 'account_issues' table).

### Post Management

a post can have many comments and ratings
have a column 'views_counter'
status: PUBLISHED, DRAFT
have published_at to allow publishing a post at a future date

Model the database for this table accordingly

### Dashboards

Admin dashboard can view and manage users

- Can lock accounts for a period (a dropdown with common options such as 1 hour, 2 hours, 1 day, 3 days, 1 week, 1 month, 3 months, 6 months, 9 months, 1 year)
- The page for managin a user should have an mini-sidebar with such options as 'Manage Roles', 'Manage passwords', 'Posts posted', 'Account Issues' (in case they have been banned or locked or suspended)
  Admin dashboard can view and manage posts

User dashboard

- manage their own posts
- manage their profile (even support for avatar upload)

and any other non-captured pages.

Posts should make use of [BlockNote editor](https://www.blocknotejs.org/)
