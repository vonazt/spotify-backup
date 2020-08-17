import { model, Schema, Document, Model } from 'mongoose';
import axios from 'axios';
import { Track } from '../models';
import qs from 'qs';
import fs from 'fs';

interface SpotifyTrack {
  track: {
    name: string;
    album: { name: string };
    artists: { name: string }[];
    id: string;
  };
}

interface TrackDocument extends Document {
  track: string;
  album: string;
  artists: string[];
  spotifyId: string;
}

export const getCollectiblesPlaylist = async (): Promise<string> => {
  const data = { grant_type: `client_credentials` };
  const {
    data: { access_token: accessToken },
  } = await axios({
    method: `POST`,
    url: `https://accounts.spotify.com/api/token`,
    data: qs.stringify(data),
    headers: {
      Authorization: `Basic ${process.env.SPOTIFY_AUTH_SECRET}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
  });
  console.log(`Fetching collectibles tracks...`);
  console.time(`Fetched collectibles tracks in`);
  const collectiblesTracks = await getCollectiblesTracks(
    `https://api.spotify.com/v1/playlists/546C1VqlSpUXRAs0zZQ0jZ/tracks`,
    accessToken,
  );
  console.timeEnd(`Fetched collectibles tracks in`);
  console.log('all tracks', collectiblesTracks);
  fs.writeFileSync(`./collectibles.json`, JSON.stringify(collectiblesTracks));
  const upsertedCount = await bulkWriteTracks(collectiblesTracks);
  return `Successfully uploaded ${upsertedCount} tracks`;
};

const allTracks: Track[] = [];

const getCollectiblesTracks = async (
  nextUrl: string,
  accessToken: string,
): Promise<Track[]> => {
  const {
    data: { items, next },
  } = await axios({
    method: `GET`,
    url: nextUrl,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const tracks = items.map(
    ({ track: { name, album, artists, id } }: SpotifyTrack) => {
      return {
        track: name,
        album: album.name,
        artists: artists.map(({ name }) => name),
        spotifyId: id,
      };
    },
  );

  allTracks.push(...tracks);

  if (next) {
    return getCollectiblesTracks(next, accessToken);
  } else {
    return allTracks;
  }
};

const TrackSchema = new Schema({
  track: String,
  album: String,
  artists: [String],
  spotifyId: String,
});

const connectToSchema = async <T extends Document>(
  collection: string,
  schema: Schema,
): Promise<Model<T>> => model<T>(collection, schema);

const bulkWriteTracks = async (tracks: Track[]): Promise<number> => {
  const SpotifyModel = await connectToSchema(`Spotify`, TrackSchema);
  const bulkWriteQuery = tracks.map((track: Track) => {
    return {
      updateOne: {
        filter: { spotifyId: track.spotifyId },
        update: track,
        upsert: true,
      },
    };
  });
  const { upsertedCount } = await SpotifyModel.bulkWrite(bulkWriteQuery);
  return upsertedCount;
};

export const listCollectiblesPlaylist = async (): Promise<Track[]> => {
  const SpotifyModel = await connectToSchema(`Spotify`, TrackSchema);
  const data = (await SpotifyModel.find({}, null, {
    lean: true,
  })) as TrackDocument[];
  return data;
};
