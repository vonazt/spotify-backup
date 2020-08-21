import React, { useEffect, useContext } from "react";
import { useMutation } from "@apollo/client";
import { SAVE_PLAYLIST } from "./gql";
import { LoadingSpinner } from "./LoadingSpinner";
import FileSaver from "file-saver";
import { Parser } from "json2csv";
import { SavedPlaylist, FormattedPlaylist } from "./types";
import { handleGraphQLError } from "./utils";
import { LoggedInContext, LoggedInContextProps } from "./LoggedInContext";

type PlaylistProps = {
  id: string;
  name: string;
};

export const Playlist: React.FC<PlaylistProps> = ({
  id,
  name,
}: PlaylistProps) => {
  const { setIsLoggedIn } = useContext<LoggedInContextProps>(LoggedInContext);
  const [
    savePlaylist,
    { data: savedPlaylist, loading: savingPlaylist },
  ] = useMutation<SavedPlaylist>(SAVE_PLAYLIST, {
    onError: (error) => handleGraphQLError(error, setIsLoggedIn),
  });

  useEffect(() => {
    if (savedPlaylist) {
      const json2csvParser = new Parser();
      const playlistCsv = json2csvParser.parse(
        JSON.parse(savedPlaylist.savePlaylist).map(
          (playlist: FormattedPlaylist) => ({
            ...playlist,
            artists: playlist.artists.join(`, `),
          })
        )
      );
      const blob = new Blob([playlistCsv], { type: `text/csv;charset=utf-8` });
      FileSaver.saveAs(blob, `${name}.csv`);
    }
  }, [savedPlaylist, name]);

  const handleSavePlaylist = (id: string) => {
    savePlaylist({ variables: { id } });
  };

  return (
    <tr className="border-4 border-spotifyGreen">
      <td className="p-4">{name}</td>
      {savingPlaylist ? (
        <LoadingSpinner />
      ) : (
        <td
          className="p-4 cursor-pointer"
          onClick={() => handleSavePlaylist(id)}
        >
          Save
        </td>
      )}
    </tr>
  );
};
