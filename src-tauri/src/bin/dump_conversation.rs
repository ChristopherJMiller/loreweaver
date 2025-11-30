//! Debug tool to dump AI conversations from the database

use clap::Parser;
use sea_orm::{Database, EntityTrait, QueryOrder, QueryFilter, ColumnTrait};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "dump_conversation")]
#[command(about = "Debug tool to dump AI conversations from the database")]
struct Args {
    /// Path to database file (or set LOREWEAVER_DB env var)
    #[arg(long, env = "LOREWEAVER_DB")]
    db: Option<PathBuf>,

    /// Filter by context type
    #[arg(long, value_parser = ["sidebar", "fullpage"])]
    context: Option<String>,

    /// Show only the most recent conversation
    #[arg(long)]
    last: bool,

    /// Show only message summaries (no content)
    #[arg(long)]
    summary: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Find the database file
    let db_path = args.db.map(Ok).unwrap_or_else(find_db_path)?;
    println!("📁 Database: {}\n", db_path.display());

    let db_url = format!("sqlite:{}?mode=ro", db_path.display());
    let db = Database::connect(&db_url).await?;

    // Load all conversations
    use entity::ai_conversations::{self, Entity as AiConversation};
    use entity::ai_messages::{self, Entity as AiMessage};

    let mut conversations = AiConversation::find()
        .order_by_desc(ai_conversations::Column::UpdatedAt)
        .all(&db)
        .await?;

    if let Some(ref ctx) = args.context {
        conversations.retain(|c| c.context_type == *ctx);
    }

    if args.last && !conversations.is_empty() {
        conversations.truncate(1);
    }

    if conversations.is_empty() {
        println!("No conversations found.");
        return Ok(());
    }

    for conv in conversations {
        println!("═══════════════════════════════════════════════════════════════════════════════");
        println!("📝 Conversation: {} ({})", conv.context_type.to_uppercase(), conv.id);
        println!("   Campaign: {}", conv.campaign_id);
        println!("   Tokens: {} in / {} out / {} cache read / {} cache create",
            conv.total_input_tokens,
            conv.total_output_tokens,
            conv.total_cache_read_tokens,
            conv.total_cache_creation_tokens
        );
        println!("   Updated: {}", conv.updated_at);
        println!("───────────────────────────────────────────────────────────────────────────────");

        // Load messages for this conversation
        let messages = AiMessage::find()
            .filter(ai_messages::Column::ConversationId.eq(&conv.id))
            .order_by_asc(ai_messages::Column::MessageOrder)
            .all(&db)
            .await?;

        if messages.is_empty() {
            println!("   (no messages)\n");
            continue;
        }

        for msg in messages {
            let role_icon = match msg.role.as_str() {
                "user" => "👤",
                "assistant" => "🤖",
                "tool" => "🔧",
                "error" => "❌",
                "proposal" => "📋",
                _ => "❓",
            };

            println!("\n{} [{}] {}", role_icon, msg.message_order, msg.role.to_uppercase());

            if let Some(tool_name) = &msg.tool_name {
                println!("   Tool: {}", tool_name);
            }

            if args.summary {
                // Just show length
                println!("   Content: ({} chars)", msg.content.len());
            } else {
                // Print content (truncated if long)
                let content = &msg.content;
                if content.len() > 500 {
                    println!("   Content: {}...", &content[..500]);
                } else {
                    println!("   Content: {}", content);
                }

                // Print tool input if present
                if let Some(tool_input) = &msg.tool_input_json {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(tool_input) {
                        println!("   Tool Input: {}", serde_json::to_string_pretty(&parsed)?);
                    }
                }

                // Print tool data summary if present
                if let Some(tool_data) = &msg.tool_data_json {
                    if tool_data.len() > 200 {
                        println!("   Tool Data: {}...", &tool_data[..200]);
                    } else {
                        println!("   Tool Data: {}", tool_data);
                    }
                }

                // Print proposal if present
                if let Some(proposal) = &msg.proposal_json {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(proposal) {
                        println!("   Proposal: {}", serde_json::to_string_pretty(&parsed)?);
                    }
                }
            }
        }
        println!("\n");
    }

    Ok(())
}

fn find_db_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // Try common locations
    let candidates = vec![
        // Development database
        PathBuf::from("dev.db"),
        PathBuf::from("../dev.db"),
        // App data locations (Linux)
        dirs::data_local_dir()
            .map(|p| p.join("com.loreweaver.app/loreweaver.db"))
            .unwrap_or_default(),
        dirs::data_dir()
            .map(|p| p.join("com.loreweaver.app/loreweaver.db"))
            .unwrap_or_default(),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err("Could not find database file. Use --db <path> or set LOREWEAVER_DB env var.".into())
}
