# Database

Generated at https://dbdiagram.io/

```
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table users {
  inbox_email varchar [unique, not null, note: '@subscrubby email']
  outbox_email varchar [unique, not null, note: '@gmail email']
  admin integer [note: '0=no 1=yes', default: 0]
  created_at timestamp
  indexes {
      inbox_email [pk]
      outbox_email [unique, note:'']
  }
}
```