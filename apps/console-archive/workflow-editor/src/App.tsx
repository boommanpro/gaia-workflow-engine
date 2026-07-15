import { Editor } from './editor';
function App(props) {
  return (
    <div className={'main-app'}>
      <Editor {...props} />
    </div>
  );
}

export default App;