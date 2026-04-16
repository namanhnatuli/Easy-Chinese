# Supabase Schema Guidelines

## Auth
Use Supabase Auth for:
- email identity
- Google SSO

## Profiles
Create a `profiles` table linked to auth.users by id.

## Roles
Use an enum or constrained text field:
- user
- admin

Anonymous users are not stored as profiles until they sign in.

## RLS policy direction
- public read for published words, grammar, lessons
- authenticated users can read their own progress
- authenticated users can upsert their own progress
- only admin role can write content tables

## Content publish model
All public content tables should have `is_published`.
Non-admin users can only read published records.

## Migration expectations
- include indexes on slug, hsk_level, topic_id, radical_id
- include created_at / updated_at
- include foreign keys with sensible delete behavior