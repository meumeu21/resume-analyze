import NetworkGraphChart from './NetworkGraphChart';
import SkillMapChart from './SkillMapChart';
import CoordinatesChart from './CoordinatesChart';
import ActivityChart from './ActivityChart';
import type { MyProfileResponse, UserProfileResponse } from '../api/users';

interface ProfileChartsSectionProps {
  isOwn: boolean;
  isEditing: boolean;
  open: boolean;
  onToggle: () => void;
  myProfile: MyProfileResponse | null;
  otherProfile: UserProfileResponse | null;
  networkGraphLoading: boolean;
  networkGraphError: string;
  skillMapLoading: boolean;
  skillMapError: string;
  coordinatesLoading: boolean;
  coordinatesError: string;
  onBuildNetworkGraph: () => void;
  onDeleteNetworkGraph: () => void;
  onBuildSkillMap: () => void;
  onDeleteSkillMap: () => void;
  onBuildCoordinates: () => void;
  onDeleteCoordinates: () => void;
}

function ProfileChartsSection({
  isOwn, isEditing, open, onToggle,
  myProfile, otherProfile,
  networkGraphLoading, networkGraphError,
  skillMapLoading, skillMapError,
  coordinatesLoading, coordinatesError,
  onBuildNetworkGraph, onDeleteNetworkGraph,
  onBuildSkillMap, onDeleteSkillMap,
  onBuildCoordinates, onDeleteCoordinates,
}: ProfileChartsSectionProps) {
  const ownHasCoords = !!myProfile?.coordinates;
  const ownHasSkill = !!(myProfile?.skillMap && myProfile.skillMap.length > 0);
  const ownHasNetwork = !!(myProfile?.networkGraph && myProfile.networkGraph.nodes.length > 0);
  const ownAiCount = [ownHasCoords, ownHasSkill, ownHasNetwork].filter(Boolean).length;
  const ownGridCount = isEditing ? 3 : ownAiCount;

  const otherHasCoords = !!otherProfile?.coordinates;
  const otherHasSkill = !!(otherProfile?.skillMap && otherProfile.skillMap.length > 0);
  const otherHasNetwork = !!(otherProfile?.networkGraph && otherProfile.networkGraph.nodes.length > 0);
  const otherAiCount = [otherHasCoords, otherHasSkill, otherHasNetwork].filter(Boolean).length;

  return (
    <div className="textField">
      <div className="textField-header">
        <h2 className="profile-h2">Графики</h2>
        <div className="textField-actions">
          <button
            className={`textField-button ${open ? 'open' : ''}`}
            onClick={onToggle}
          >▼</button>
        </div>
      </div>

      {open && isOwn && (
        <div className={`profile-charts-grid profile-charts-grid--${ownGridCount}`}>
          {(isEditing || ownHasNetwork) && (
            <div className="profile-chart-cell">
              {ownHasNetwork && <NetworkGraphChart data={myProfile!.networkGraph!} />}
              {isEditing && (
                <div className="coordinates-actions">
                  <button className="button-light text" onClick={onBuildNetworkGraph} disabled={networkGraphLoading}>
                    {networkGraphLoading ? 'Анализ...' : ownHasNetwork ? 'Перегенерировать граф' : 'Построить граф технологий'}
                  </button>
                  {ownHasNetwork && (
                    <button className="button-light text" onClick={onDeleteNetworkGraph}>Удалить граф</button>
                  )}
                  {networkGraphError && <p className="error-text text">{networkGraphError}</p>}
                </div>
              )}
            </div>
          )}
          {(isEditing || ownHasSkill) && (
            <div className="profile-chart-cell">
              {ownHasSkill && <SkillMapChart skills={myProfile!.skillMap!} />}
              {isEditing && (
                <div className="coordinates-actions">
                  <button className="button-light text" onClick={onBuildSkillMap} disabled={skillMapLoading}>
                    {skillMapLoading ? 'Анализ...' : ownHasSkill ? 'Перегенерировать карту' : 'Построить карту навыков'}
                  </button>
                  {ownHasSkill && (
                    <button className="button-light text" onClick={onDeleteSkillMap}>Удалить карту</button>
                  )}
                  {skillMapError && <p className="error-text text">{skillMapError}</p>}
                </div>
              )}
            </div>
          )}
          {(isEditing || ownHasCoords) && (
            <div className="profile-chart-cell">
              {ownHasCoords && (
                <CoordinatesChart x={myProfile!.coordinates!.x} y={myProfile!.coordinates!.y} />
              )}
              {isEditing && (
                <div className="coordinates-actions">
                  <button className="button-light text" onClick={onBuildCoordinates} disabled={coordinatesLoading}>
                    {coordinatesLoading ? 'Анализ...' : ownHasCoords ? 'Перегенерировать' : 'Построить график'}
                  </button>
                  {ownHasCoords && (
                    <button className="button-light text" onClick={onDeleteCoordinates}>Удалить график</button>
                  )}
                  {coordinatesError && <p className="error-text text">{coordinatesError}</p>}
                </div>
              )}
            </div>
          )}
          <div className="profile-chart-cell profile-chart-cell--activity">
            <ActivityChart projects={myProfile?.projects ?? []} />
          </div>
        </div>
      )}

      {open && !isOwn && (
        <div className={`profile-charts-grid profile-charts-grid--${otherAiCount}`}>
          {otherHasNetwork && (
            <div className="profile-chart-cell">
              <NetworkGraphChart data={otherProfile!.networkGraph!} />
            </div>
          )}
          {otherHasSkill && (
            <div className="profile-chart-cell">
              <SkillMapChart skills={otherProfile!.skillMap!} />
            </div>
          )}
          {otherHasCoords && (
            <div className="profile-chart-cell">
              <CoordinatesChart x={otherProfile!.coordinates!.x} y={otherProfile!.coordinates!.y} />
            </div>
          )}
          <div className="profile-chart-cell profile-chart-cell--activity">
            <ActivityChart projects={otherProfile?.publicProjects ?? []} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileChartsSection;
