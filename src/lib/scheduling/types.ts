/** A single video with metadata needed for scheduling. */
export type Video = {
	id: string;
	title: string;
	duration: number; // seconds
	thumbnail: string;
	creator?: string; // source channel name
};

/** A source of videos — defaults, user-imported (YouTube), or local files. */
export type ChannelSource =
	| { type: 'default'; youtubeChannelIds: string[]; videos: Video[] }
	| { type: 'imported'; videos: Video[] }
	| { type: 'local'; videos: Video[] };

/** A TV channel composed of one or more video sources. */
export type Channel = {
	name: string;
	slug: string;
	number: number;
	category: string;
	sources: ChannelSource[];
};

/** Result of computing what's currently playing on a channel. */
export type ScheduleResult = {
	video: Video;
	offsetSeconds: number;
	nextVideo: Video;
	secondsUntilNext: number;
};

/** A time slot in the program guide. */
export type GuideSlot = {
	video: Video;
	startTime: number; // unix timestamp (seconds)
	endTime: number; // unix timestamp (seconds)
};

/** Check if a video is a local file (not YouTube). */
export function isLocalVideo(video: Video): boolean {
	return video.id.startsWith('local::');
}

/** Check if a channel contains local video files. */
export function isLocalChannel(channel: Channel): boolean {
	return channel.sources.some((s) => s.type === 'local');
}
