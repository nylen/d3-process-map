<?php
require_once 'common.php';
read_data();

header('Content-type: application/json');
echo json_encode(array(
    'data'   => $data,
    'errors' => $errors
));
?>
