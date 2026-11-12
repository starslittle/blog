---
title: '让 Claude 桌面版的多个账号自动共享会话列表'
description: '切账号或切组织后，侧边栏的会话像是全丢了。用 cc-sync 把列表合并回来，再加一个每 5 分钟跑一次的后台任务，就不用再手动同步了。'
pubDate: '2026-11-12'
---

我在 Claude 桌面版里有好几个账号和组织，经常来回切。每次一切，侧边栏的会话列表就像被清空了，或者停在很久以前，看着像是之前干的活全没了。

## 其实什么都没丢

查下来发现，Claude 桌面版的数据分两层：

- **对话正文**存在 `~/.claude/projects`，跟你登录的是哪个账号、哪个组织无关，本来就是共用的。
- **侧边栏列表**才是按"账号 / 组织"分开存的，位置在 `~/Library/Application Support/Claude/claude-code-sessions/<账号>/<组织>/` 下面，每个会话一个 `local_*.json`。

换一个账号或组织，看到的就是另一份列表。消息还在，只是那份列表里没有它的入口。

## cc-sync：把列表合并回来

[cc-sync](https://github.com/dayinji/cc-sync) 是一个开源小工具（MIT），专门做这件事：把各个账号、组织下的列表取并集，补到每一份里去。

```bash
cc-sync              # 合并
cc-sync --dry-run    # 只预览
cc-sync status       # 各份列表有多少条、差多少
cc-sync undo         # 撤销上一次合并
```

它有几条我很喜欢的原则：只增不删，最坏情况是多一条，不会少一条；先写临时文件再替换，App 不会读到写了一半的文件；每次合并都留一份回滚记录，随时能撤销；你自己删掉的会话会记下来，不会被别处的副本"复活"。

有一点要知道：Claude 只在启动时或切换进某个组织时读取列表。所以合并之后，**切到另一个组织**马上能看到；但合并进你**当前所在组织**的那部分，要完全退出（Cmd+Q）再打开才会出现。

## 每次手动跑太麻烦，那就让它自己跑

手动跑的问题是总会忘。于是我用 macOS 自带的 launchd 加了一个后台任务，每 5 分钟跑一次 cc-sync，开机自启。这样任何时候切组织，列表基本都是全的，最多差最近几分钟新建的会话。

这里先说清楚它做不到的：**你正在用的那个组织不会实时刷新**，这是桌面版本身的限制，脚本绕不过去。它解决的是"切过去会话不见了"，不是"两边同时实时出现"。

### 直接定时跑原工具会踩的坑

一开始我以为写个定时任务调用 `cc-sync` 就完了，实际有三个坑：

1. **回滚记录写不进去。** 这个最隐蔽。cc-sync 留回滚记录时用的是相对路径，只有在 Claude 的数据目录下运行才写得进去；从别的目录运行（后台任务默认在根目录）会悄悄什么都不记，同步照样成功，但 `cc-sync undo` 其实撤销不了。解决办法是运行前先 `cd` 到 Claude 的数据目录。
2. **回滚记录会膨胀。** 每个列表文件大概 700KB，每次同步都存一份变动的历史，频繁运行的话一天能涨不少。所以超过 300MB 或者满 7 天就换一份新的，旧的留一份备份，再旧的删掉。
3. **可能卡死。** cc-sync 用一个目录当"正在运行"的标记。如果某次运行被打断（比如合上电脑），这个标记会残留，之后每次都会因为"已经有一个在跑"而失败，而且不会提示你。所以超过 15 分钟、又没有进程在跑的标记，直接清掉。

### 脚本

我没有改 cc-sync 本身，只是在外面包了一层。前提是已经按 cc-sync 的说明装好，`~/bin/cc-sync` 能用。把下面的内容存成 `~/bin/cc-sync-auto`，加上执行权限，然后运行一次 `cc-sync-auto install`：

```bash
#!/bin/bash
# cc-sync-auto — run cc-sync in the background every 5 minutes via launchd.
#
#   cc-sync-auto install     register the background job (runs now, then every 5 min)
#   cc-sync-auto uninstall   remove the background job (cc-sync itself is untouched)
#   cc-sync-auto status      is the job loaded, last runs, rollback repo size
#   cc-sync-auto log         show the last 30 log lines
#   cc-sync-auto run         one sync pass (this is what launchd calls)
#
# A wrapper only: cc-sync (~/bin/cc-sync -> ~/cc-sync/bin/cc-sync) is not modified.
# What the wrapper adds on top of a plain `cc-sync`:
#   - clears a stale ~/.cc-sync.lock.d left by an interrupted run (sleep, kill), which
#     would otherwise make every later run fail silently
#   - keeps the rollback repo bounded: cc-sync commits on every run and the index files
#     are ~0.7 MB each, so once ~/.cc-sync-git passes ROTATE_MB or ROTATE_DAYS it is moved
#     to ~/.cc-sync-git.prev (the previous .prev is dropped) and cc-sync starts a fresh
#     baseline on the next merge. You always keep the current and the previous history.
#   - one-line-per-run log at ~/Library/Logs/cc-sync-auto.log, trimmed to the last 2000 lines

set -u

LABEL="com.taotang.cc-sync-auto"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SELF="$HOME/bin/cc-sync-auto"
CC_SYNC="$HOME/bin/cc-sync"
LOG="$HOME/Library/Logs/cc-sync-auto.log"
LOCK="$HOME/.cc-sync.lock.d"
REPO="$HOME/.cc-sync-git"
INTERVAL=300          # seconds between runs
STALE_LOCK_MIN=15     # a lock older than this with no cc-sync process is stale
ROTATE_MB=300         # rotate the rollback repo above this size ...
ROTATE_DAYS=7         # ... or when its oldest commit is older than this

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }

trim_log() {
	[ -f "$LOG" ] || return 0
	if [ "$(wc -l < "$LOG")" -gt 2000 ]; then
		tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
	fi
}

clear_stale_lock() {
	[ -d "$LOCK" ] || return 0
	if pgrep -f "$HOME/cc-sync/bin/cc-sync|bin/cc-sync( |$)" > /dev/null 2>&1; then
		return 0
	fi
	local age_min=$(( ( $(date +%s) - $(stat -f %m "$LOCK") ) / 60 ))
	if [ "$age_min" -ge "$STALE_LOCK_MIN" ]; then
		rmdir "$LOCK" 2>/dev/null && log "cleared stale lock (${age_min} min old)"
	fi
}

rotate_repo() {
	[ -d "$REPO" ] || return 0
	local size_mb oldest age_days reason=""
	size_mb=$(du -sm "$REPO" | awk '{print $1}')
	oldest=$(git --git-dir "$REPO" log --reverse --format=%ct 2>/dev/null | head -1)
	age_days=0
	[ -n "$oldest" ] && age_days=$(( ( $(date +%s) - oldest ) / 86400 ))
	if [ "$size_mb" -ge "$ROTATE_MB" ]; then
		reason="${size_mb} MB"
	elif [ "$age_days" -ge "$ROTATE_DAYS" ]; then
		reason="${age_days} days old"
	fi
	[ -n "$reason" ] || return 0
	rm -rf "${REPO:?}.prev"
	mv "$REPO" "$REPO.prev" && log "rotated rollback repo ($reason) -> ~/.cc-sync-git.prev"
}

cmd_run() {
	mkdir -p "$(dirname "$LOG")"
	if [ ! -x "$CC_SYNC" ]; then
		log "ERROR cc-sync not found at $CC_SYNC"
		exit 1
	fi
	clear_stale_lock
	rotate_repo
	local out rc summary
	# cc-sync's rollback commits use a relative pathspec ("claude-code-sessions"), which git
	# resolves against the current directory. From any other cwd (launchd starts in /) the
	# commit silently records nothing, so always run it from the Claude data dir.
	cd "$HOME/Library/Application Support/Claude" || { log "ERROR Claude data dir not found"; exit 1; }
	out=$("$CC_SYNC" 2>&1); rc=$?
	# keep the informative lines, drop the "Done. Switch to..." boilerplate
	summary=$(printf '%s\n' "$out" | grep -E 'sync|new,|tombstone|rollback point|ERROR|another cc-sync|Created' \
		| grep -v -E '^Done\.' | tr '\n' ' ' | sed -E 's/ +/ /g; s/ $//')
	[ -n "$summary" ] || summary=$(printf '%s' "$out" | head -1)
	if [ "$rc" -eq 0 ]; then log "ok   $summary"; else log "FAIL rc=$rc $summary"; fi
	trim_log
	return "$rc"
}

cmd_install() {
	mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
	cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>$LABEL</string>
	<key>ProgramArguments</key>
	<array>
		<string>$SELF</string>
		<string>run</string>
	</array>
	<key>StartInterval</key>
	<integer>$INTERVAL</integer>
	<key>RunAtLoad</key>
	<true/>
	<key>ProcessType</key>
	<string>Background</string>
	<key>LowPriorityIO</key>
	<true/>
	<key>Nice</key>
	<integer>10</integer>
	<key>StandardOutPath</key>
	<string>$LOG</string>
	<key>StandardErrorPath</key>
	<string>$LOG</string>
</dict>
</plist>
EOF
	launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
	if launchctl bootstrap "gui/$(id -u)" "$PLIST"; then
		echo "Installed. cc-sync now runs every $((INTERVAL / 60)) minutes in the background."
		echo "Log: ~/Library/Logs/cc-sync-auto.log    Stop: cc-sync-auto uninstall"
	else
		echo "launchctl bootstrap failed." >&2
		return 1
	fi
}

cmd_uninstall() {
	launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
	rm -f "$PLIST"
	echo "Background sync removed. cc-sync itself, its rollback repo and the log are left as they are."
}

cmd_status() {
	if launchctl print "gui/$(id -u)/$LABEL" > /dev/null 2>&1; then
		echo "background job : loaded (every $((INTERVAL / 60)) min)"
		launchctl print "gui/$(id -u)/$LABEL" | grep -E 'last exit code|runs =' | sed 's/^[[:space:]]*/                 /'
	else
		echo "background job : not loaded"
	fi
	[ -d "$REPO" ] && echo "rollback repo  : $(du -sh "$REPO" | awk '{print $1}')" \
		"(rotates at ${ROTATE_MB} MB or ${ROTATE_DAYS} days)"
	[ -d "$REPO.prev" ] && echo "previous repo  : $(du -sh "$REPO.prev" | awk '{print $1}') at ~/.cc-sync-git.prev"
	echo "last runs      :"
	[ -f "$LOG" ] && tail -n 5 "$LOG" | sed 's/^/   /'
}

case "${1:-status}" in
	run) cmd_run ;;
	install) cmd_install ;;
	uninstall) cmd_uninstall ;;
	status) cmd_status ;;
	log) [ -f "$LOG" ] && tail -n 30 "$LOG" ;;
	*) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
```

装好之后：

```bash
cc-sync-auto status      # 后台任务在不在跑、最近几次结果
cc-sync-auto log         # 最近 30 条日志
cc-sync-auto uninstall   # 不想要了就卸掉，cc-sync 本身不受影响
```

如果你也要用，记得把 `LABEL` 里的 `com.taotang` 换成你自己的名字。

## 还有两个限制

- **侧边栏分组不会同步。** 分组存在 App 的内部存储里，cc-sync 刻意不碰，同步过去的会话在另一个组织里是没分组的。
- **MCP 连接器按组织分配。** 在另一个组织里打开会话，之前用的某些连接器可能用不了，不影响看历史。

装上之后，切组织之前不用再想着先跑一次同步了。
