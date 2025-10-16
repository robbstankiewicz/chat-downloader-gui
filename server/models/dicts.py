import enum
from typing import Dict, List

class DownloadStatus(enum.Enum):
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class PlatformType(enum.Enum):
    TWITCH = 1
    YOUTUBE = 2


class MessageGroup(enum.Enum):
    messages = 1
    bans = 2
    subs = 3


message_groups_by_platform: Dict[PlatformType, List[MessageGroup]] = {
    PlatformType.TWITCH: [
        'messages',
        'bans',
        'subscriptions',
    ],
    PlatformType.YOUTUBE: [
        'messages',
        'bans',
        'superchat',
    ],
}

message_types = {
    "text_message": MessageGroup.messages,
    "highlighted_message": MessageGroup.messages,
    "send_message_in_subscriber_only_mode": MessageGroup.messages,
    "ban_user": MessageGroup.bans,
    "already_banned": MessageGroup.bans,
    "bad_ban_self": MessageGroup.bans,
    "bad_ban_broadcaster": MessageGroup.bans,
    "bad_ban_admin": MessageGroup.bans,
    "bad_ban_global_mod": MessageGroup.bans,
    "bad_ban_staff": MessageGroup.bans,
    "ban_success": MessageGroup.bans,
    "bad_unban_no_ban": MessageGroup.bans,
    "unban_success": MessageGroup.bans,
    "channel_suspended_message": MessageGroup.bans,
    "timeout_success": MessageGroup.bans,
    "bad_timeout_self": MessageGroup.bans,
    "bad_timeout_broadcaster": MessageGroup.bans,
    "bad_timeout_mod": MessageGroup.bans,
    "bad_timeout_admin": MessageGroup.bans,
    "bad_timeout_global_mod": MessageGroup.bans,
    "bad_timeout_staff": MessageGroup.bans,
    "subscription": MessageGroup.subs,
    "resubscription": MessageGroup.subs,
    "subscription_gift": MessageGroup.subs,
    "anonymous_subscription_gift": MessageGroup.subs,
    "anonymous_mystery_subscription_gift": MessageGroup.subs,
    "mystery_subscription_gift": MessageGroup.subs,
    "extend_subscription": MessageGroup.subs,
    "standard_pay_forward": MessageGroup.subs,
    "community_pay_forward": MessageGroup.subs,
    "prime_community_gift_received": MessageGroup.subs,
    "membership_item": MessageGroup.subs,
    "paid_message": MessageGroup.subs,
    "paid_sticker": MessageGroup.subs,
    "sponsorships_gift_purchase_announcement": MessageGroup.subs,
}
