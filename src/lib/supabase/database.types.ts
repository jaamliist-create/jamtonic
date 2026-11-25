
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"entity_id": string | null,"entity_type": string,"id": string,"meta": NonNullable<Json>,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"meta"?: NonNullable<Json>,"summary"?: string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"meta"?: NonNullable<Json>,"summary"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"concert_sessions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"listed": boolean,"max_votes_per_participant": number | null,"name": string,"playlist_id": string | null,"slug": string,"starts_at": string | null,"starts_on": string,"status": Database["public"]['Enums']["session_status"],"updated_at": string,"updated_by": string | null,"venue": string | null,"voting_open": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"listed"?: boolean,"max_votes_per_participant"?: number | null,"name": string,"playlist_id"?: string | null,"slug"?: string,"starts_at"?: string | null,"starts_on": string,"status"?: Database["public"]['Enums']["session_status"],"updated_at"?: string,"updated_by"?: string | null,"venue"?: string | null,"voting_open"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"listed"?: boolean,"max_votes_per_participant"?: number | null,"name"?: string,"playlist_id"?: string | null,"slug"?: string,"starts_at"?: string | null,"starts_on"?: string,"status"?: Database["public"]['Enums']["session_status"],"updated_at"?: string,"updated_by"?: string | null,"venue"?: string | null,"voting_open"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "concert_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concert_sessions_playlist_id_fkey"
      columns: ["playlist_id"]
isOneToOne: false
      referencedRelation: "playlists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concert_sessions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"genres": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"name_norm": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"name_norm"?: never
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"name_norm"?: never
                  }
                  Relationships: [
                    
                  ]
                },"internal_votes": {
                  Row: {
                    "created_at": string,"member_id": string,"song_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"member_id": string,"song_id": string
                  }
                  Update: {
                    "created_at"?: string,"member_id"?: string,"song_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_votes_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_votes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "internal_votes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"playlist_songs": {
                  Row: {
                    "added_at": string,"id": string,"playlist_id": string,"position": number,"song_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"id"?: string,"playlist_id": string,"position"?: number,"song_id": string
                  }
                  Update: {
                    "added_at"?: string,"id"?: string,"playlist_id"?: string,"position"?: number,"song_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "playlist_songs_playlist_id_fkey"
      columns: ["playlist_id"]
isOneToOne: false
      referencedRelation: "playlists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "playlist_songs_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "playlist_songs_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"playlists": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"created_by": string | null,"description": string,"id": string,"name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "playlists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "playlists_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"instrument": string | null,"is_active": boolean,"is_owner": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"instrument"?: string | null,"is_active"?: boolean,"is_owner"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"instrument"?: string | null,"is_active"?: boolean,"is_owner"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"public_suggestions": {
                  Row: {
                    "artist": string,"artist_norm": string | null,"created_at": string,"handled_at": string | null,"handled_by": string | null,"id": string,"participant_id": string | null,"session_id": string | null,"song_id": string | null,"status": Database["public"]['Enums']["suggestion_status"],"title": string,"title_norm": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "artist": string,"artist_norm"?: never,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"participant_id"?: string | null,"session_id"?: string | null,"song_id"?: string | null,"status"?: Database["public"]['Enums']["suggestion_status"],"title": string,"title_norm"?: never
                  }
                  Update: {
                    "artist"?: string,"artist_norm"?: never,"created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"participant_id"?: string | null,"session_id"?: string | null,"song_id"?: string | null,"status"?: Database["public"]['Enums']["suggestion_status"],"title"?: string,"title_norm"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "public_suggestions_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_suggestions_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "concert_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_suggestions_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_suggestions_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"public_votes": {
                  Row: {
                    "created_at": string,"id": string,"participant_id": string,"session_id": string,"song_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"participant_id": string,"session_id": string,"song_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"participant_id"?: string,"session_id"?: string,"song_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "public_votes_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "concert_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_votes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "public_votes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_songs": {
                  Row: {
                    "position": number,"session_id": string,"song_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "position"?: number,"session_id": string,"song_id": string
                  }
                  Update: {
                    "position"?: number,"session_id"?: string,"song_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_songs_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "concert_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_songs_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_songs_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"song_genres": {
                  Row: {
                    "genre_id": string,"song_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "genre_id": string,"song_id": string
                  }
                  Update: {
                    "genre_id"?: string,"song_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "song_genres_genre_id_fkey"
      columns: ["genre_id"]
isOneToOne: false
      referencedRelation: "genres"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_genres_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_genres_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"song_member_notes": {
                  Row: {
                    "body": string,"member_id": string,"song_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"member_id": string,"song_id": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"member_id"?: string,"song_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "song_member_notes_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_member_notes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_member_notes_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    }
                  ]
                },"song_tags": {
                  Row: {
                    "song_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "song_id": string,"tag_id": string
                  }
                  Update: {
                    "song_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "song_tags_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "public_songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_tags_song_id_fkey"
      columns: ["song_id"]
isOneToOne: false
      referencedRelation: "songs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "song_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"songs": {
                  Row: {
                    "archived_at": string | null,"artist": string,"artist_norm": string | null,"bpm": number | null,"created_at": string,"created_by": string | null,"duration_seconds": number | null,"id": string,"learning_priority": Database["public"]['Enums']["learning_priority"] | null,"links": NonNullable<Json>,"musical_key": string | null,"notes": string,"status": Database["public"]['Enums']["song_status"],"title": string,"title_norm": string | null,"updated_at": string,"updated_by": string | null,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"artist": string,"artist_norm"?: never,"bpm"?: number | null,"created_at"?: string,"created_by"?: string | null,"duration_seconds"?: number | null,"id"?: string,"learning_priority"?: Database["public"]['Enums']["learning_priority"] | null,"links"?: NonNullable<Json>,"musical_key"?: string | null,"notes"?: string,"status"?: Database["public"]['Enums']["song_status"],"title": string,"title_norm"?: never,"updated_at"?: string,"updated_by"?: string | null,"year"?: number | null
                  }
                  Update: {
                    "archived_at"?: string | null,"artist"?: string,"artist_norm"?: never,"bpm"?: number | null,"created_at"?: string,"created_by"?: string | null,"duration_seconds"?: number | null,"id"?: string,"learning_priority"?: Database["public"]['Enums']["learning_priority"] | null,"links"?: NonNullable<Json>,"musical_key"?: string | null,"notes"?: string,"status"?: Database["public"]['Enums']["song_status"],"title"?: string,"title_norm"?: never,"updated_at"?: string,"updated_by"?: string | null,"year"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "songs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "songs_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"name_norm": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"name_norm"?: never
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"name_norm"?: never
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "public_concerts": {
                  Row: {
                    "name": string,"slug": string,"starts_at": string | null,"starts_on": string,"status": Database["public"]['Enums']["session_status"],"venue": string | null,"voting_open": boolean
                  }
                  ComputedFields: never
                  Insert: {
                           "name"?: string | null,"slug"?: string | null,"starts_at"?: string | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["session_status"] | null,"venue"?: string | null,"voting_open"?: boolean | null
                         }
                        Update: {
                           "name"?: string | null,"slug"?: string | null,"starts_at"?: string | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["session_status"] | null,"venue"?: string | null,"voting_open"?: boolean | null
                         }
                        Relationships: [
                    
                  ]
                },"public_songs": {
                  Row: {
                    "artist": string,"duration_seconds": number | null,"genres": (string)[] | null,"id": string,"title": string,"year": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "artist"?: string | null,"duration_seconds"?: number | null,"genres"?: never,"id"?: string | null,"title"?: string | null,"year"?: number | null
                         }
                        Update: {
                           "artist"?: string | null,"duration_seconds"?: number | null,"genres"?: never,"id"?: string | null,"title"?: string | null,"year"?: number | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "add_song_to_playlist":
{ Args: { "p_playlist": string,"p_song": string }; Returns: undefined
                           },
"cast_public_vote":
{ Args: { "p_on": boolean,"p_participant": string,"p_slug": string,"p_song": string }; Returns: Json
                           },
"check_rate_limit":
{ Args: { "p_bucket": string,"p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"create_song_from_suggestion":
{ Args: { "p_suggestion": string }; Returns: Json
                           },
"duplicate_playlist":
{ Args: { "p_name": string,"p_playlist": string }; Returns: string
                           },
"is_member":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"jt_normalize":
{ Args: { "p": string }; Returns: string
                           },
"participant_votes":
{ Args: { "p_participant": string,"p_slug": string }; Returns: string[]
                           },
"public_get_session":
{ Args: { "p_slug": string }; Returns: {
              "max_votes_per_participant": number,"name": string,"slug": string,"starts_at": string,"starts_on": string,"status": Database["public"]['Enums']["session_status"],"venue": string,"voting_open": boolean
            }[]
                           },
"public_session_songs":
{ Args: { "p_slug": string }; Returns: {
              "artist": string,"genres": (string)[],"id": string,"title": string
            }[]
                           },
"reorder_playlist":
{ Args: { "p_playlist": string,"p_song_ids": (string)[] }; Returns: undefined
                           },
"session_ranking":
{ Args: { "p_session": string }; Returns: {
              "artist": string,"in_selection": boolean,"rank": number,"recent": number,"song_id": string,"status": Database["public"]['Enums']["song_status"],"title": string,"votes": number
            }[]
                           },
"set_session_songs":
{ Args: { "p_session": string,"p_song_ids": (string)[] }; Returns: undefined
                           },
"stats_mastered_by_month":
{ Args: Record<PropertyKey, never>; Returns: {
              "mastered": number,"month": string
            }[]
                           },
"stats_sessions":
{ Args: Record<PropertyKey, never>; Returns: {
              "name": string,"participants": number,"session_id": string,"songs_voted": number,"starts_on": string,"status": Database["public"]['Enums']["session_status"],"suggestions": number,"venue": string,"votes": number
            }[]
                           },
"stats_top_requested":
{ Args: { "p_limit"?: number }; Returns: {
              "artist": string,"sessions": number,"song_id": string,"title": string,"votes": number
            }[]
                           },
"stats_top_suggestions":
{ Args: { "p_limit"?: number }; Returns: {
              "artist": string,"last_at": string,"requests": number,"title": string
            }[]
                           },
"submit_public_suggestion":
{ Args: { "p_artist": string,"p_participant"?: string,"p_slug"?: string,"p_title": string }; Returns: string
                           }
          }
          Enums: {
            "learning_priority": "urgent"|"moyen_terme"|"pour_le_fun","session_status": "brouillon"|"programmee"|"active"|"terminee","song_status": "a_decouvrir"|"a_apprendre"|"en_cours"|"a_reviser"|"maitrise","suggestion_status": "nouvelle"|"retenue"|"ecartee"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "learning_priority": ["urgent", "moyen_terme", "pour_le_fun"],"session_status": ["brouillon", "programmee", "active", "terminee"],"song_status": ["a_decouvrir", "a_apprendre", "en_cours", "a_reviser", "maitrise"],"suggestion_status": ["nouvelle", "retenue", "ecartee"]
          }
        }
} as const
