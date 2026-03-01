import sys
import os
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../python')))

from notifier import send_telegram_alert, send_discord_alert, send_alert

@pytest.fixture
def mock_aiohttp_session():
    with patch('aiohttp.ClientSession') as mock_session_class:
        mock_session = AsyncMock()
        mock_session_class.return_value.__aenter__.return_value = mock_session
        
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        yield mock_session

@pytest.mark.asyncio
@patch('notifier.get_settings_sync')
@patch.dict(os.environ, {"EXECUTION_BOT_TOKEN": "bot_token", "TELEGRAM_CHAT_ID": "chat_id"})
async def test_telegram_alert_sends_successfully(mock_get_settings, mock_aiohttp_session):
    mock_get_settings.return_value = {}
    
    await send_telegram_alert("Test message")
    
    mock_aiohttp_session.post.assert_called_once()
    args, kwargs = mock_aiohttp_session.post.call_args
    assert "api.telegram.org/botbot_token/sendMessage" in args[0]
    assert kwargs["json"]["chat_id"] == "chat_id"
    assert kwargs["json"]["text"] == "Test message"

@pytest.mark.asyncio
@patch('notifier.get_settings_sync')
@patch.dict(os.environ, {"DISCORD_WEBHOOK_URL": "http://discord.webhook"})
async def test_discord_alert_sends_successfully(mock_get_settings, mock_aiohttp_session):
    mock_get_settings.return_value = {}
    
    await send_discord_alert("<b>Bold</b> and <i>Italic</i>")
    
    mock_aiohttp_session.post.assert_called_once()
    args, kwargs = mock_aiohttp_session.post.call_args
    assert args[0] == "http://discord.webhook"
    # Verify HTML tags are stripped/converted for Discord
    assert kwargs["json"]["content"] == "**Bold** and *Italic*"

@pytest.mark.asyncio
@patch('notifier.send_telegram_alert', new_callable=AsyncMock)
@patch('notifier.send_discord_alert', new_callable=AsyncMock)
async def test_unified_send_alert(mock_discord, mock_telegram):
    await send_alert("Unified test")
    
    mock_telegram.assert_called_once_with("Unified test")
    mock_discord.assert_called_once_with("Unified test")

@pytest.mark.asyncio
@patch('notifier.get_settings_sync')
@patch.dict(os.environ, clear=True)
async def test_alerts_fail_silently_if_unconfigured(mock_get_settings, mock_aiohttp_session):
    # No env vars and no DB settings
    mock_get_settings.return_value = {}
    
    await send_telegram_alert("Test")
    await send_discord_alert("Test")
    
    # Session shouldn't be called because the functions should return early
    mock_aiohttp_session.post.assert_not_called()
