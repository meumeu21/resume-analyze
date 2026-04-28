type ContactProfileProps = {
    type: string,
    link: string,
    id: string
};

function ContactProfile({ type, link, id }: ContactProfileProps) {
    return (
        <div className="contact-profile">
            <p className="contact-profile__type text">{type}:</p>
            <a href={link} className="contact-profile__link link text">{id}</a>
        </div>
    )
}

export default ContactProfile;