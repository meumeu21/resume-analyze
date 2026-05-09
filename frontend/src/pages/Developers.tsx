import Footer from "../components/Footer";
import Header from "../components/Header";
import ProfilePreview from "../components/ProfilePreview";

import "../css/main.css"

import search from "../images/icons/search.svg";
import filter from "../images/icons/filter.svg";
import avatar from "../images/avatar-profile.jpg";

function Developers() {
  return (
    <div>
      <Header />
      <div className="container page">
        <div className="search-field">
          <form>
            <input type="text" id="name" name="user_name" placeholder="Введите имя"></input> 
            <button type="button"><img src={filter} alt="Filter" /></button>
            
            <button><img src={search} alt="Search" /></button>
          </form>
          
        </div>

        <div className="filters">
            <label>
              <input type="radio" name="developerFilter" value="all" defaultChecked />
              Все
            </label>

            <label>
              <input type="radio" name="developerFilter" value="frontend" />
              Frontend
            </label>

            <label>
              <input type="radio" name="developerFilter" value="backend" />
              Backend
            </label>

            <label>
              <input type="radio" name="developerFilter" value="fullstack" />
              Fullstack
            </label>
          </div>

          <div className="developers-search__result">
            <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
            <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
            <ProfilePreview username="User user" AIdescription="Backend-разработчик" linkToAvatar={avatar} linkToProfile="/users/me" numOfSubs="11" numOfProjects="5"></ProfilePreview>
          </div>
        
      </div>
      <Footer />
    </div>
  );
}

export default Developers;