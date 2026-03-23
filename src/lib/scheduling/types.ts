/** A single YouTube video with metadata needed for scheduling. */
export type Video = {
	id: string;
	title: string;
	duration: number; // seconds
	thumbnail: string;
};

/** A source of videos — either baked-in defaults or user-imported. */
export type ChannelSource =
	| { type: 'default'; youtubeChannelId: string; videos: Video[] }
	| { type: 'imported'; videos: Video[] };

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
	offsetSeconds: number; // how far into the video we are
	nextVideo: Video;
	secondsUntilNext: number;
};

/** A time slot in the program guide. */
export type GuideSlot = {
	video: Video;
	startTime: number; // unix timestamp (seconds)
	endTime: number; // unix timestamp (seconds)
};
