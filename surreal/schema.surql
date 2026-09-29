-- Supercal — SurrealDB 3.x schema
-- NS/DB: calendar / main

DEFINE NAMESPACE OVERWRITE calendar;
DEFINE DATABASE OVERWRITE main;

USE NS calendar DB main;

DEFINE ACCESS OVERWRITE account ON DATABASE TYPE RECORD
  SIGNUP (
    CREATE user SET
      email = $email,
      pass = crypto::argon2::generate($pass),
      role = 'owner',
      created_at = time::now()
  )
  SIGNIN (
    SELECT * FROM user WHERE email = $email AND crypto::argon2::compare(pass, $pass)
  )
  DURATION FOR TOKEN 7d, FOR SESSION 30d;

DEFINE TABLE OVERWRITE user SCHEMAFULL
  PERMISSIONS
    FOR select WHERE id = $auth.id
    FOR update WHERE id = $auth.id
    FOR create NONE
    FOR delete NONE;

DEFINE FIELD OVERWRITE email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD OVERWRITE pass ON user TYPE string PERMISSIONS FOR select NONE;
DEFINE FIELD OVERWRITE role ON user TYPE string DEFAULT 'owner';
DEFINE FIELD OVERWRITE created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE user_email ON user FIELDS email UNIQUE;

DEFINE TABLE OVERWRITE settings SCHEMAFULL
  PERMISSIONS
    FOR select, create, update, delete FULL;

DEFINE FIELD OVERWRITE interval_sec ON settings TYPE number DEFAULT 900 ASSERT $value >= 30 AND $value <= 86400;
DEFINE FIELD OVERWRITE next_sync_at ON settings TYPE option<datetime>;
DEFINE FIELD OVERWRITE seeded ON settings TYPE bool DEFAULT false;

DEFINE TABLE OVERWRITE connection SCHEMAFULL
  PERMISSIONS
    FOR select, create, update, delete FULL;

DEFINE FIELD OVERWRITE provider ON connection TYPE string ASSERT $value IN ['apple', 'google'];
DEFINE FIELD OVERWRITE label ON connection TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE secret_enc ON connection TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE detail ON connection TYPE object DEFAULT {};
DEFINE FIELD OVERWRITE connected_at ON connection TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE connection_provider ON connection FIELDS provider UNIQUE;

DEFINE TABLE OVERWRITE link SCHEMAFULL
  PERMISSIONS
    FOR select, create, update, delete FULL;

DEFINE FIELD OVERWRITE desk ON link TYPE string ASSERT $value IN ['practice', 'live'];
DEFINE FIELD OVERWRITE uid ON link TYPE string;
DEFINE FIELD OVERWRITE hash ON link TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE apple_href ON link TYPE option<string>;
DEFINE FIELD OVERWRITE google_id ON link TYPE option<string>;
DEFINE FIELD OVERWRITE starts_at ON link TYPE string;
DEFINE FIELD OVERWRITE ends_at ON link TYPE string;
DEFINE FIELD OVERWRITE mirrored ON link COMPUTED apple_href != NONE AND google_id != NONE;
REMOVE INDEX IF EXISTS link_uid ON link;
DEFINE INDEX OVERWRITE link_desk_uid ON link FIELDS desk, uid UNIQUE;

DEFINE TABLE OVERWRITE practice_event SCHEMAFULL
  PERMISSIONS
    FOR select, create, update, delete FULL;

DEFINE FIELD OVERWRITE uid ON practice_event TYPE string;
DEFINE FIELD OVERWRITE side ON practice_event TYPE string ASSERT $value IN ['apple', 'google'];
DEFINE FIELD OVERWRITE title ON practice_event TYPE string;
DEFINE FIELD OVERWRITE description ON practice_event TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE location ON practice_event TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE starts_at ON practice_event TYPE string;
DEFINE FIELD OVERWRITE ends_at ON practice_event TYPE string;
DEFINE FIELD OVERWRITE all_day ON practice_event TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE recurrence ON practice_event TYPE string DEFAULT '';
DEFINE FIELD OVERWRITE updated_at ON practice_event TYPE datetime;
DEFINE FIELD OVERWRITE status ON practice_event TYPE string DEFAULT 'confirmed' ASSERT $value IN ['confirmed', 'cancelled'];
DEFINE FIELD OVERWRITE href ON practice_event TYPE option<string>;
DEFINE FIELD OVERWRITE google_id ON practice_event TYPE option<string>;
DEFINE FIELD OVERWRITE etag ON practice_event TYPE option<string>;
DEFINE INDEX OVERWRITE practice_uid_side ON practice_event FIELDS uid, side UNIQUE;

DEFINE TABLE OVERWRITE sync_run SCHEMAFULL
  PERMISSIONS
    FOR select, create, update, delete FULL;

DEFINE FIELD OVERWRITE run_id ON sync_run TYPE string;
DEFINE FIELD OVERWRITE trigger ON sync_run TYPE string ASSERT $value IN ['manual', 'periodic'];
DEFINE FIELD OVERWRITE mode ON sync_run TYPE string ASSERT $value IN ['practice', 'live'];
DEFINE FIELD OVERWRITE started_at ON sync_run TYPE datetime;
DEFINE FIELD OVERWRITE finished_at ON sync_run TYPE datetime;
DEFINE FIELD OVERWRITE created_n ON sync_run TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE updated_n ON sync_run TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE deleted_n ON sync_run TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE messages ON sync_run TYPE array<string> DEFAULT [];
DEFINE FIELD OVERWRITE errors ON sync_run TYPE array<string> DEFAULT [];
